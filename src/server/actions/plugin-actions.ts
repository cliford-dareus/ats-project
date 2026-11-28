"use server";

// Server action = auth check + delegate to DB query
import {AutomationRule, OrgPluginState} from "@/types";
import {db_get_job_automation_rules, db_get_org_plugin_state_for_client, db_get_organization_plugins_raw, saveJobAutomationRule as db_save_job_automation_rule, deleteJobAutomationRule as db_delete_job_automation_rule} from "@/server/queries/drizzle/plugin-queries";
import {automationRuleSchema} from "@/zod";
import {decrypt_plugin_secret} from "@/lib/plugin-encryption";
import {buildTestMessage, isSlackWebhookUrl, postSlackWebhook} from "@/lib/slack";
import {buildTestMessage as buildTeamsTestMessage, isTeamsWebhookUrl, postTeamsWebhook} from "@/lib/teams";
import { getCalendlyCurrentUser } from "@/server/calendly";
import { getZoomCurrentUser } from "@/server/zoom";
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

/**
 * Validate an OpenAI API key with a lightweight call — GET /v1/models
 * returns 200 for a valid key, 401 for an invalid one. Called from the
 * client-side OpenAI provider auth flow (mirrors verifyGoogle above).
 * The key is sent only to OpenAI, over HTTPS, in the Authorization
 * header — never logged, never stored here (saving is a separate,
 * encrypting step). No org ID is needed: Chat Completions accepts a
 * plain API key, so the plugin stores only the key.
 */
export async function verifyOpenAI(apiKey: string): Promise<{ success: boolean; message: string }> {
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
            "https://api.openai.com/v1/models",
            {
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(10_000),
            },
        );

        if (res.ok) {
            return { success: true, message: "API Key is valid" };
        }

        // 401 = the key itself is rejected. Anything else (429, 5xx,
        // network) is a verification failure, not proof the key is bad —
        // say so instead of telling the user the key is invalid.
        let detail = "";
        try {
            const body = await res.json() as { error?: { message?: string } };
            detail = body?.error?.message ?? "";
        } catch {
            // Non-JSON error body — fall through to the generic message.
        }

        if (res.status === 401) {
            return { success: false, message: detail || "Invalid API Key" };
        }
        return { success: false, message: `OpenAI verification failed (HTTP ${res.status})` };
    } catch (err) {
        console.error("OpenAI API Key Verification Error:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to verify API key",
        };
    }
}

/**
 * Validate an Anthropic API key with a lightweight call to the Anthropic
 * API — GET /v1/models returns 200 for a valid key, 401 for an invalid
 * one. Called from the client-side Anthropic provider auth flow
 * (mirrors verifyGoogle above). The key is sent only to Anthropic, over
 * HTTPS, in the x-api-key header — never logged, never stored here
 * (saving is a separate, encrypting step).
 */
export async function verifyAnthropic(apiKey: string): Promise<{ success: boolean; message: string }> {
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
        const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
            headers: {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
            signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
            return { success: true, message: "API Key is valid" };
        }

        let detail = "";
        try {
            const body = await res.json() as { error?: { message?: string } };
            detail = body?.error?.message ?? "";
        } catch {
            // Non-JSON error body — fall through to the generic message.
        }

        if (res.status === 401) {
            return { success: false, message: detail || "Invalid API Key" };
        }
        return { success: false, message: `Anthropic verification failed (HTTP ${res.status})` };
    } catch (err) {
        console.error("Anthropic API Key Verification Error:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to verify API key",
        };
    }
}

/**
 * Validate a Calendly Personal Access Token with a lightweight call —
 * GET /users/me returns 200 for a valid token (with scopes), 401 for an
 * invalid one. Called from the client-side Calendly provider auth flow
 * (mirrors verifyGoogle above). The key is sent only to Calendly, over
 * HTTPS, in the Authorization header — never logged, never stored here
 * (saving is a separate, encrypting step). Returns the connected user's
 * name/email/URI on success so the config UI can display them.
 */
export async function verifyCalendly(apiKey: string): Promise<{
    success: boolean;
    message: string;
    user?: { name: string; email: string; uri: string };
}> {
    // Plugin credential setup is plugin management (admin-only).
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const key = apiKey?.trim();
    if (!key) {
        return { success: false, message: "Personal access token is required" };
    }

    try {
        const user = await getCalendlyCurrentUser(key);
        return {
            success: true,
            message: "Token is valid",
            user: { name: user.name, email: user.email, uri: user.uri },
        };
    } catch (err) {
        console.error("Calendly token verification error:", err);
        return {
            success: false,
            message:
                (err as Error).message ||
                "Failed to verify Calendly token",
        };
    }
}

/**
 * Verify Zoom Server-to-Server OAuth credentials with a live call —
 * mint a token, then GET /users/me returns 200 for valid credentials,
 * 401 for invalid ones. Called from the client-side Zoom provider auth
 * flow (mirrors verifyCalendly above). The credentials are sent only to
 * Zoom, over HTTPS — never logged, never stored here (saving is a
 * separate, encrypting step). Returns the connected user (the Zoom
 * account owner — the "me" for a Server-to-Server app) on success so
 * the config UI can display who hosts the meetings.
 */
export async function verifyZoom(
    accountId: string,
    clientId: string,
    clientSecret: string
): Promise<{
    success: boolean;
    message: string;
    user?: { name: string; email: string; id: string };
}> {
    // Plugin credential setup is plugin management (admin-only).
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const account = accountId?.trim();
    const client = clientId?.trim();
    const secret = clientSecret?.trim();
    if (!account || !client || !secret) {
        return {
            success: false,
            message: "Account ID, Client ID, and Client Secret are all required",
        };
    }

    try {
        const user = await getZoomCurrentUser({
            accountId: account,
            clientId: client,
            clientSecret: secret,
        });
        const name = [user.first_name, user.last_name]
            .filter(Boolean)
            .join(" ");
        return {
            success: true,
            message: "Credentials are valid",
            user: {
                name: name || user.email || "Zoom account owner",
                email: user.email ?? "",
                id: user.id,
            },
        };
    } catch (err) {
        console.error("Zoom credential verification error:", err);
        return {
            success: false,
            message:
                (err as Error).message ||
                "Failed to verify Zoom credentials",
        };
    }
}

/**
 * Verify a Slack incoming webhook URL by posting a REAL test message to
 * it and reporting Slack's real answer. Called from the client-side Slack
 * provider auth flow (mirrors verifyGoogle / verifyCalendly above). The
 * URL is sent only to Slack, over HTTPS — never logged, never stored here
 * (saving is a separate, encrypting step).
 *
 * Slack answers most webhook calls with HTTP 200 and a plain-text body,
 * so the body is checked: only "ok" counts as delivered; anything else
 * (e.g. "invalid_payload", "channel_not_found") is the failure message.
 */
export async function verifySlackWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    // Plugin credential setup is plugin management (admin-only).
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const url = webhookUrl?.trim();
    if (!url) {
        return { success: false, message: "Webhook URL is required" };
    }
    if (!isSlackWebhookUrl(url)) {
        return { success: false, message: "Enter a Slack incoming webhook URL (https://hooks.slack.com/services/…)" };
    }

    try {
        const result = await postSlackWebhook(url, buildTestMessage());
        if (result.ok) {
            return { success: true, message: "Test message posted to Slack" };
        }
        return { success: false, message: `Slack rejected the test message: ${result.error}` };
    } catch (err) {
        console.error("Slack webhook verification error:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to verify Slack webhook",
        };
    }
}

/**
 * Post a test message through the org's SAVED webhook (decrypted
 * server-side) — the browser never sees the URL. Requires plugin:manage.
 * Used by the settings "Send test message" button after connect.
 */
export async function testSlackWebhook(): Promise<{ success: boolean; message: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    try {
        // Decrypt ONLY Slack's webhook (not the whole org blob): another
        // plugin's undecryptable key must not break this test.
        const record = await db_get_organization_plugins_raw(orgId);
        const stored = record.settings?.["slack-notify"]?.credentials?.webhookUrl;
        if (!stored) {
            return { success: false, message: "Connect a Slack webhook URL first" };
        }
        const webhookUrl = decrypt_plugin_secret(stored);
        if (!isSlackWebhookUrl(webhookUrl)) {
            return { success: false, message: "The saved Slack webhook URL is not a valid hooks.slack.com URL — re-enter it" };
        }
        const result = await postSlackWebhook(webhookUrl, buildTestMessage());
        if (result.ok) {
            return { success: true, message: "Test message posted to Slack" };
        }
        return { success: false, message: `Slack rejected the test message: ${result.error}` };
    } catch (err) {
        // Decryption failures (e.g. key rotated without a re-encryption
        // pass) surface as a test failure, not a crash.
        console.error("Failed to test Slack webhook:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to test Slack webhook",
        };
    }
}

/**
 * Verify a Teams webhook URL by posting a REAL test card to it and
 * reporting Teams' real answer. Called from the client-side Teams
 * provider auth flow (mirrors verifySlackWebhook above). The URL is
 * sent only to Teams, over HTTPS — never logged, never stored here
 * (saving is a separate, encrypting step).
 *
 * Success semantics differ by endpoint — see src/lib/teams.ts: a
 * Workflows webhook answers 202, which means the workflow ACCEPTED the
 * request, not that the card is in the channel. That is reported as
 * "accepted", never as "posted".
 */
export async function verifyTeamsWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    // Plugin credential setup is plugin management (admin-only).
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const url = webhookUrl?.trim();
    if (!url) {
        return { success: false, message: "Webhook URL is required" };
    }
    if (!isTeamsWebhookUrl(url)) {
        return { success: false, message: "Enter a Teams webhook URL — from the Workflows app (…logic.azure.com…) or a classic Incoming Webhook (…webhook.office.com…)" };
    }

    try {
        const result = await postTeamsWebhook(url, buildTeamsTestMessage());
        if (result.ok) {
            return {
                success: true,
                message: result.accepted
                    ? "Test card accepted by the Teams workflow — delivery is async, check the channel"
                    : "Test card posted to Teams",
            };
        }
        return { success: false, message: `Teams rejected the test card: ${result.error}` };
    } catch (err) {
        console.error("Teams webhook verification error:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to verify Teams webhook",
        };
    }
}

/**
 * Post a test card through the org's SAVED webhook (decrypted
 * server-side) — the browser never sees the URL. Requires plugin:manage.
 * Used by the settings "Send test message" button after connect.
 */
export async function testTeamsWebhook(): Promise<{ success: boolean; message: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    try {
        // Decrypt ONLY Teams' webhook (not the whole org blob): another
        // plugin's undecryptable key must not break this test.
        const record = await db_get_organization_plugins_raw(orgId);
        const stored = record.settings?.["teams-notify"]?.credentials?.webhookUrl;
        if (!stored) {
            return { success: false, message: "Connect a Teams webhook URL first" };
        }
        const webhookUrl = decrypt_plugin_secret(stored);
        if (!isTeamsWebhookUrl(webhookUrl)) {
            return { success: false, message: "The saved Teams webhook URL is not a valid Teams URL — re-enter it" };
        }
        const result = await postTeamsWebhook(webhookUrl, buildTeamsTestMessage());
        if (result.ok) {
            return {
                success: true,
                message: result.accepted
                    ? "Test card accepted by the Teams workflow — delivery is async, check the channel"
                    : "Test card posted to Teams",
            };
        }
        return { success: false, message: `Teams rejected the test card: ${result.error}` };
    } catch (err) {
        // Decryption failures (e.g. key rotated without a re-encryption
        // pass) surface as a test failure, not a crash.
        console.error("Failed to test Teams webhook:", err);
        return {
            success: false,
            message: (err as Error).message || "Failed to test Teams webhook",
        };
    }
}

export async function saveJobAutomationRule(jobId: number, rule: AutomationRule): Promise<AutomationRule> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:edit");
    await assertJobBelongsToOrg(jobId, orgId);

    // B5: the rule used to be persisted verbatim — unknown triggers,
    // garbage delays, and fire_integration targets pointing at
    // non-existent integrations all landed in the DB. Validate at this
    // boundary; the DB layer keeps trusting its caller.
    const parsed = automationRuleSchema.safeParse(rule);
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid automation rule");
    }
    if (parsed.data.job_id !== jobId) {
        throw new Error("Automation rule job does not match the requested job");
    }

    return db_save_job_automation_rule(jobId, {
        ...parsed.data,
        created_at: parsed.data.created_at ?? new Date().toISOString(),
        updated_at: parsed.data.updated_at ?? new Date().toISOString(),
    }, orgId);
};

export async function deleteJobAutomationRule(jobId: number, ruleId: string): Promise<void> {
    const {orgId} = await getAuthOrThrow();
    await requirePermission("job:edit");
    await assertJobBelongsToOrg(jobId, orgId);

    return db_delete_job_automation_rule(jobId, ruleId, orgId);
};