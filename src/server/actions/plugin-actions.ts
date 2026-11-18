"use server";

// Server action = auth check + delegate to DB query
import {AutomationRule, OrgPluginState} from "@/types";
import {db_get_job_automation_rules, db_get_org_plugin_state_for_client, saveJobAutomationRule as db_save_job_automation_rule, deleteJobAutomationRule as db_delete_job_automation_rule} from "@/server/queries/drizzle/plugin-queries";
import {assertJobBelongsToOrg, getAuthOrThrow, hasPermission, requirePermission} from "@/server/permissions";

export async function getJobAutomationRules(jobId: number): Promise<AutomationRule[]> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:view");
    await assertJobBelongsToOrg(jobId, orgId);

    if (!orgId) return [];
    return db_get_job_automation_rules(jobId, orgId);
};

export async function getOrgPluginState(orgId: string): Promise<OrgPluginState> {
    const {orgId: sessionOrgId} = await getAuthOrThrow();

    if (!sessionOrgId || sessionOrgId !== orgId) {
        return { flags: {}, installed: [] };
    }
    // Client-facing shape: credentials are MASKED (•••• + last 4), never
    // full keys. Server-side consumers that need usable keys use
    // db_get_org_plugin_state (decrypted) directly, never this action.
    return db_get_org_plugin_state_for_client(orgId)
};

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