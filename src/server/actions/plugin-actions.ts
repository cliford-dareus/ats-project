"use server";

// Server action = auth check + delegate to DB query
import {AutomationRule, OrgPluginState} from "@/types";
import {db_get_job_automation_rules, db_get_org_plugin_state_for_client, db_get_organization_plugins_raw, saveJobAutomationRule as db_save_job_automation_rule, deleteJobAutomationRule as db_delete_job_automation_rule} from "@/server/queries/drizzle/plugin-queries";
import {decrypt_plugin_secret} from "@/lib/plugin-encryption";
import {Resend} from "resend";
import {assertJobBelongsToOrg, AuthzError, getAuthOrThrow, hasPermission, requirePermission} from "@/server/permissions";

export async function getJobAutomationRules(jobId: number): Promise<AutomationRule[]> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:view");
    await assertJobBelongsToOrg(jobId, orgId);

    if (!orgId) return [];
    return db_get_job_automation_rules(jobId, orgId);
};

/**
 * Full plugin state for the settings UI — masked keys (•••• + last 4),
 * flags, and full plugin config (company name, hiring-manager/recruiter
 * emails, From address). Admin-only: requires plugin:manage. Non-managers
 * are denied with NO data — no flags, no installed list, nothing.
 * Server-side consumers that need usable keys use
 * db_get_org_plugin_state (decrypted) directly, never this action.
 * Dashboard feature gating for every role uses getOrgPluginFlags().
 */
export async function getOrgPluginState(orgId: string): Promise<OrgPluginState> {
    const {orgId: sessionOrgId} = await getAuthOrThrow();

    if (!sessionOrgId || sessionOrgId !== orgId) {
        // 404-style, like assertJobBelongsToOrg: a cross-tenant probe
        // can't tell "exists in another org" from "doesn't exist".
        throw new AuthzError("Organization mismatch", 404);
    }
    await requirePermission("plugin:manage");

    return db_get_org_plugin_state_for_client(orgId);
};

/**
 * Feature flags ONLY, for dashboard-wide gating (PluginSystemProvider).
 * Safe to call for any authenticated org member: the org always comes
 * from the Clerk session, and the return value is just booleans —
 * no keys (masked or otherwise), no config, no contact emails, no
 * From address, no plugin settings.
 */
export async function getOrgPluginFlags(): Promise<Record<string, boolean>> {
    const {orgId} = await getAuthOrThrow();
    const state = await db_get_org_plugin_state_for_client(orgId);
    return state.flags;
};

/**
 * List the org's Resend domains (GET /domains) with the org's STORED key,
 * decrypted server-side — the browser never sees the key. Only verified
 * domains can be used as a From address. Requires plugin:manage.
 * A sending-only key is refused by Resend on every management endpoint
 * (401 restricted_api_key): that is reported as a load failure with an
 * explanation, not a crash — the UI then lets the user type the domain
 * instead of picking from the list.
 */
export async function listResendDomains(): Promise<{
    success: boolean;
    domains?: { name: string; status: string }[];
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    try {
        // Decrypt ONLY Resend's key (not the whole org blob): another
        // plugin's undecryptable key must not break this listing.
        const record = await db_get_organization_plugins_raw(orgId);
        const stored = record.settings?.resend?.credentials?.apiKey;
        if (!stored) {
            return { success: false, message: "Connect a Resend API key first" };
        }
        const apiKey = decrypt_plugin_secret(stored);

        const resend = new Resend(apiKey);
        const { data, error } = await resend.domains.list();
        if (error) {
            const name = String((error as { name?: unknown } | null)?.name ?? "");
            const message = String((error as { message?: unknown } | null)?.message ?? "");
            if (name === "restricted_api_key") {
                return {
                    success: false,
                    message: "This API key has sending-only access, so Resend won't list domains. Use a full-access key to load verified domains, or type the domain manually.",
                };
            }
            return { success: false, message: message || "Failed to load Resend domains" };
        }
        return {
            success: true,
            domains: (data?.data ?? []).map((d) => ({ name: d.name, status: d.status })),
            message: "Domains loaded",
        };
    } catch (err) {
        // Decryption failures (e.g. key rotated without a re-encryption
        // pass) surface as a load failure, not a crash.
        console.error("Failed to list Resend domains:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to load Resend domains",
        };
    }
}

/**
 * Validate a Google (Gemini) API key with a lightweight call to the Gemini
 * API — GET /v1beta/models returns 200 for a valid key, 400/403 for an
 * invalid one. Called from the client-side Google provider auth flow
 * (mirrors verifyResend in stage_actions.ts). The key is sent only to
 * Google, over HTTPS, in the x-goog-api-key header — never logged, never
 * stored here (saving is a separate, encrypting step).
 */
export async function verifyGoogle(apiKey: string): Promise<{ success: boolean; message: string }> {
    // Plugin credential setup is plugin management (admin-only).
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const key = apiKey?.trim();
    if (!key) {
        return { success: false, message: "API key is required" };
    }

    try {
        const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
            {
                headers: { "x-goog-api-key": key },
                signal: AbortSignal.timeout(10_000),
            },
        );

        if (res.ok) {
            return { success: true, message: "API Key is valid" };
        }

        // 400/403 = the key itself is rejected (API_KEY_INVALID). Anything
        // else (5xx, network) is a verification failure, not proof the key
        // is bad — say so instead of telling the user the key is invalid.
        let detail = "";
        try {
            const body = await res.json() as { error?: { message?: string } };
            detail = body?.error?.message ?? "";
        } catch {
            // Non-JSON error body — fall through to the generic message.
        }

        if (res.status === 400 || res.status === 403) {
            return { success: false, message: detail || "Invalid API Key" };
        }
        return { success: false, message: `Google verification failed (HTTP ${res.status})` };
    } catch (err) {
        console.error("Google API Key Verification Error:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to verify API key",
        };
    }
}

export async function saveJobAutomationRule(jobId: number, rule: AutomationRule): Promise<AutomationRule> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:edit");
    await assertJobBelongsToOrg(jobId, orgId);

    return db_save_job_automation_rule(jobId, rule, orgId);
};

export async function deleteJobAutomationRule(jobId: number, ruleId: string): Promise<void> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:edit");
    await assertJobBelongsToOrg(jobId, orgId);

    return db_delete_job_automation_rule(jobId, ruleId, orgId);
};