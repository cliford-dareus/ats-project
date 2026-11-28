"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/whatsapp-actions.ts — WhatsApp Business messaging via
// Twilio's WhatsApp API.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow / requirePermission) and the application is proven to
// belong to it (assertApplicationBelongsToOrg, 404-style). No
// client-supplied orgId is ever trusted. Config reads are plugin:manage;
// per-application send / consent / refresh are application:edit; reads
// are application:view. The Twilio Auth Token is decrypted server-side
// only, sent only to Twilio over HTTPS, never logged, never returned.
//
// Flow (template-only — see src/server/whatsapp.ts):
//   1. Org connects Twilio in Settings → WhatsApp (Account SID + Auth
//      Token verified live against GET /Accounts/{sid}.json; From number
//      = the org's registered WhatsApp sender; default template =
//      an approved Content Template SID). The sender itself cannot be
//      verified without sending — a wrong sender fails at send time
//      with Twilio's real error.
//   2. Recruiter records WhatsApp consent for the candidate on the
//      application card (who + when stored; the opt-in record itself
//      stays with the org). No message is ever sent without consent on
//      file — the send action refuses, it does not warn-and-continue.
//   3. Recruiter sends an approved template (Content SID + variables
//      {{1}}, {{2}}, {{3}}). Only templates are sent — Applico has no
//      inbound webhook, so it cannot know whether the 24-hour session
//      window is open, and free-form Body outside the window fails
//      with Twilio error 63016.
//   4. The message row stores Twilio's verbatim status (queued / sent /
//      delivered / undelivered / failed). Status is refreshed on demand
//      from the card — no live polling, no webhook receiver in this
//      build, and no delivery is ever claimed that Twilio did not report.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { applications, candidates, job_listings } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
    assertApplicationBelongsToOrg,
    getAuthOrThrow,
    hasPermission,
    requirePermission,
} from "@/server/permissions";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import {
    db_get_whatsapp_consent,
    db_insert_whatsapp_message,
    db_list_whatsapp_messages,
    db_revoke_whatsapp_consent,
    db_update_whatsapp_message_status,
    db_upsert_whatsapp_consent,
    toWhatsappConsentState,
    toWhatsappMessageState,
} from "@/server/queries/drizzle/whatsapp-queries";
import {
    getTwilioWhatsAppMessage,
    normalizeToE164,
    sendTwilioWhatsAppTemplate,
    TwilioApiError,
    verifyTwilioAccount,
} from "@/server/whatsapp";
import { record_activity } from "@/server/activity/record-activity";
import type { WhatsappConsentState, WhatsappMessageState } from "@/types";

type WhatsappPluginConfig = {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    defaultTemplateSid: string;
};

/** Decrypted WhatsApp settings for the session org (server-only). */
async function loadWhatsappConfig(orgId: string): Promise<WhatsappPluginConfig | null> {
    const record = await db_get_organization_plugins(orgId);
    const settings = record.settings?.whatsapp;
    if (!settings || settings.active !== true) return null;
    const accountSid = settings.credentials?.accountSid ?? "";
    const authToken = settings.credentials?.authToken ?? "";
    if (!accountSid || !authToken) return null;
    const fromRaw = typeof settings.config?.fromNumber === "string" ? settings.config.fromNumber : "";
    const defaultTemplateSid =
        typeof settings.config?.defaultTemplateSid === "string" ? settings.config.defaultTemplateSid : "";
    return { accountSid, authToken, fromNumber: fromRaw, defaultTemplateSid };
}

function whatsappFailure(err: unknown): { success: false; message: string } {
    if (err instanceof TwilioApiError) {
        return { success: false, message: err.detail };
    }
    console.error("WhatsApp action error:", err);
    return {
        success: false,
        message: (err as Error).message || "WhatsApp request failed",
    };
}

/**
 * Validate a Twilio Account SID + Auth Token pair with a lightweight
 * call — GET /Accounts/{sid}.json returns 200 for valid credentials,
 * 401 for invalid ones — and return the account's real status so the
 * config UI can show it. Called from the client-side WhatsApp provider
 * auth flow (mirrors verifyCheckr / verifySlackWebhook). The token is
 * sent only to Twilio, over HTTPS — never logged, never stored here
 * (saving is a separate, encrypting step). This verifies the ACCOUNT,
 * not the WhatsApp sender: a wrong or unregistered From number fails
 * at send time with Twilio's real error.
 */
export async function verifyWhatsapp(
    accountSid: string,
    authToken: string,
): Promise<{ success: boolean; message: string; accountStatus?: string; friendlyName?: string }> {
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const sid = accountSid?.trim();
    const token = authToken?.trim();
    if (!sid) return { success: false, message: "Twilio Account SID is required" };
    if (!token) return { success: false, message: "Twilio Auth Token is required" };
    if (!sid.startsWith("AC")) {
        return { success: false, message: "Account SID should start with “AC”" };
    }

    try {
        const account = await verifyTwilioAccount(sid, token);
        if (account.status !== "active") {
            return {
                success: false,
                message: `Twilio account is “${account.status}”, not active — messaging is not available on this account.`,
                accountStatus: account.status,
                friendlyName: account.friendlyName,
            };
        }
        return {
            success: true,
            message: `Twilio account verified${account.friendlyName ? ` (${account.friendlyName})` : ""} — active.`,
            accountStatus: account.status,
            friendlyName: account.friendlyName,
        };
    } catch (err) {
        console.error("WhatsApp verification error:", err);
        return whatsappFailure(err);
    }
}

type ApplicationContext = {
    applicationId: number;
    candidateId: number;
    candidateName: string;
    candidatePhoneRaw: string;
    candidatePhoneE164: string | null;
    jobTitle: string | null;
};

async function loadApplicationContext(
    applicationId: number,
    orgId: string,
): Promise<ApplicationContext | null> {
    const [row] = await db
        .select({
            applicationId: applications.id,
            candidateId: candidates.id,
            candidateName: candidates.name,
            candidatePhoneRaw: candidates.phone,
            jobTitle: job_listings.name,
        })
        .from(applications)
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organization, orgId),
            ),
        )
        .limit(1);
    if (!row || !row.candidateId || !row.candidateName) return null;
    return {
        applicationId: row.applicationId,
        candidateId: row.candidateId,
        candidateName: row.candidateName,
        candidatePhoneRaw: row.candidatePhoneRaw ?? "",
        candidatePhoneE164: normalizeToE164(row.candidatePhoneRaw ?? ""),
        jobTitle: row.jobTitle,
    };
}

/** Card state for one application: consent, message history, plugin config. */
export async function get_whatsapp_state_action(applicationId: number): Promise<{
    consent: WhatsappConsentState | null;
    messages: WhatsappMessageState[];
    pluginEnabled: boolean;
    fromNumber: string;
    defaultTemplateSid: string;
    candidateName: string | null;
    candidatePhone: string | null;
    candidatePhoneE164: string | null;
    jobTitle: string | null;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");
    const application = await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadWhatsappConfig(orgId);
    const ctx = await loadApplicationContext(applicationId, orgId);
    const candidateId = ctx?.candidateId ?? application.candidate_id;
    const consentRow = candidateId ? await db_get_whatsapp_consent(candidateId, orgId) : null;
    const messageRows = await db_list_whatsapp_messages(applicationId, orgId);
    return {
        consent: consentRow ? toWhatsappConsentState(consentRow) : null,
        messages: messageRows.map(toWhatsappMessageState),
        pluginEnabled: config !== null,
        fromNumber: config?.fromNumber ?? "",
        defaultTemplateSid: config?.defaultTemplateSid ?? "",
        candidateName: ctx?.candidateName ?? null,
        candidatePhone: ctx?.candidatePhoneRaw ?? null,
        candidatePhoneE164: ctx?.candidatePhoneE164 ?? null,
        jobTitle: ctx?.jobTitle ?? null,
    };
}

/**
 * Record WhatsApp consent for the candidate. The recruiter confirms the
 * candidate agreed to be contacted on WhatsApp (e.g. opted in on the
 * apply form or agreed on a call); who + when is stored. The opt-in
 * record itself stays with the org — Applico stores who/when, not the
 * form. Consent is per candidate, not per application, and is never
 * inferred from SMS consent (there is no shared consent storage with
 * the Twilio SMS plugin) or from merely having a phone number.
 */
export async function record_whatsapp_consent_action(
    applicationId: number,
    input: { consentConfirmed: boolean; source: string },
): Promise<{ success: boolean; message: string; consent?: WhatsappConsentState }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    if (!input.consentConfirmed) {
        return {
            success: false,
            message:
                "Consent confirmation is required: confirm the candidate agreed to be contacted on WhatsApp before recording consent.",
        };
    }

    const ctx = await loadApplicationContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }
    if (!ctx.candidatePhoneE164) {
        return {
            success: false,
            message: `The candidate's stored phone number (“${ctx.candidatePhoneRaw}”) is not a valid phone number for WhatsApp — fix the number on the candidate record first.`,
        };
    }
    const source = input.source === "application_form" ? "application_form" : "manual";

    try {
        const row = await db_upsert_whatsapp_consent({
            candidateId: ctx.candidateId,
            orgId,
            phoneE164: ctx.candidatePhoneE164,
            source,
            consentedBy: userId,
        });

        await record_activity({
            action: "whatsapp_consent_recorded",
            entity_type: "application",
            entity_id: applicationId,
            summary: `WhatsApp messaging consent recorded for ${ctx.candidateName} (${source}).`,
        });

        return {
            success: true,
            message: `WhatsApp consent recorded for ${ctx.candidateName}.`,
            consent: toWhatsappConsentState(row),
        };
    } catch (err) {
        return whatsappFailure(err);
    }
}

/** Revoke WhatsApp consent — the candidate must not be messaged again until they re-consent. */
export async function revoke_whatsapp_consent_action(
    applicationId: number,
): Promise<{ success: boolean; message: string; consent?: WhatsappConsentState | null }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const ctx = await loadApplicationContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }

    try {
        const row = await db_revoke_whatsapp_consent({
            candidateId: ctx.candidateId,
            orgId,
            revokedBy: userId,
        });
        if (!row) {
            return { success: false, message: "No WhatsApp consent is on file for this candidate." };
        }

        await record_activity({
            action: "whatsapp_consent_revoked",
            entity_type: "application",
            entity_id: applicationId,
            summary: `WhatsApp messaging consent revoked for ${ctx.candidateName}.`,
        });

        return {
            success: true,
            message: "WhatsApp consent revoked — this candidate must not be messaged on WhatsApp until they consent again.",
            consent: toWhatsappConsentState(row),
        };
    } catch (err) {
        return whatsappFailure(err);
    }
}

const CONTENT_SID_PATTERN = /^HX[0-9a-f]{32}$/i;

/**
 * Send an approved WhatsApp template to the candidate. Deliberate
 * recruiter action only — never automatic. Requires consent on file,
 * a valid candidate phone number, a connected plugin, and an approved
 * template Content SID. Only the template is sent (ContentSid +
 * ContentVariables) — no free-form Body. Twilio's real response is
 * stored verbatim; a failure returns Twilio's real error and no
 * message row claims a send that did not happen.
 */
export async function send_whatsapp_message_action(
    applicationId: number,
    input: { templateContentSid: string; variables: Record<string, string> },
): Promise<{ success: boolean; message: string; sent?: WhatsappMessageState }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const templateContentSid = input.templateContentSid?.trim();
    if (!templateContentSid) {
        return {
            success: false,
            message: "A template Content SID is required. Pick the approved template configured in Settings → WhatsApp, or paste its Content SID (HX…).",
        };
    }
    if (!CONTENT_SID_PATTERN.test(templateContentSid)) {
        return {
            success: false,
            message: "That doesn't look like a Twilio Content SID — it should be “HX” followed by 32 characters. Copy it from Twilio Console → Messaging → Content Template Builder.",
        };
    }

    const config = await loadWhatsappConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "WhatsApp is not connected for this organization. Connect it in Settings → WhatsApp first.",
        };
    }
    const fromE164 = normalizeToE164(config.fromNumber);
    if (!fromE164) {
        return {
            success: false,
            message: `The configured WhatsApp sender number (“${config.fromNumber}”) is not a valid phone number. Fix it in Settings → WhatsApp.`,
        };
    }

    const ctx = await loadApplicationContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }
    if (!ctx.candidatePhoneE164) {
        return {
            success: false,
            message: `The candidate's stored phone number (“${ctx.candidatePhoneRaw}”) is not a valid phone number for WhatsApp — fix the number on the candidate record first.`,
        };
    }

    const consentRow = await db_get_whatsapp_consent(ctx.candidateId, orgId);
    const consent = consentRow ? toWhatsappConsentState(consentRow) : null;
    if (!consent?.hasConsent) {
        return {
            success: false,
            message:
                "No WhatsApp consent is on file for this candidate. Record their consent on this card first — never message a candidate on WhatsApp without it.",
        };
    }
    // Consent was recorded for a different number than the candidate's
    // current one — re-confirm consent instead of messaging a number
    // the candidate never agreed to be reached on.
    if (consent.phoneE164 !== ctx.candidatePhoneE164) {
        return {
            success: false,
            message: `Consent on file covers ${consent.phoneE164}, but the candidate's current number is ${ctx.candidatePhoneE164}. Record consent again for the current number before sending.`,
        };
    }

    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.variables ?? {})) {
        if (typeof value === "string" && value !== "") variables[key] = value;
    }

    try {
        const sent = await sendTwilioWhatsAppTemplate({
            accountSid: config.accountSid,
            authToken: config.authToken,
            fromE164,
            toE164: ctx.candidatePhoneE164,
            contentSid: templateContentSid,
            contentVariables: variables,
        });

        const row = await db_insert_whatsapp_message({
            applicationId,
            orgId,
            candidateId: ctx.candidateId,
            toPhone: ctx.candidatePhoneE164,
            templateContentSid,
            templateVariables: variables,
            twilioMessageSid: sent.sid || null,
            status: sent.status || null,
            errorMessage: sent.errorMessage,
            sentBy: userId,
        });

        await record_activity({
            action: "whatsapp_message_sent",
            entity_type: "application",
            entity_id: applicationId,
            summary: `WhatsApp template ${templateContentSid} sent to ${ctx.candidateName} via Twilio (status: ${sent.status}).`,
        });

        return {
            success: true,
            message: `Template sent via Twilio — Twilio reports status “${sent.status}”. Refresh below to see delivery updates.`,
            sent: toWhatsappMessageState(row),
        };
    } catch (err) {
        const failure = whatsappFailure(err);
        // Record the failed attempt so the card shows Twilio's real
        // error instead of silently showing nothing.
        try {
            await db_insert_whatsapp_message({
                applicationId,
                orgId,
                candidateId: ctx.candidateId,
                toPhone: ctx.candidatePhoneE164,
                templateContentSid,
                templateVariables: variables,
                twilioMessageSid: null,
                status: "failed",
                errorMessage: failure.message,
                sentBy: userId,
            });
        } catch {
            // Logging the failure must never mask the send error itself.
        }
        return failure;
    }
}

/**
 * Re-read one message's status from Twilio and store exactly what
 * Twilio reports. No polling — the recruiter triggers this from the
 * card; the stored updated_at is the "last refreshed" time shown in
 * the UI.
 */
export async function refresh_whatsapp_message_action(
    applicationId: number,
    messageId: number,
): Promise<{ success: boolean; message: string; sent?: WhatsappMessageState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadWhatsappConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "WhatsApp is not connected for this organization.",
        };
    }

    const messages = await db_list_whatsapp_messages(applicationId, orgId);
    const message = messages.find((m) => m.id === messageId);
    if (!message) {
        return { success: false, message: "Message not found for this application." };
    }
    if (!message.twilio_message_sid) {
        return {
            success: false,
            message: "This message was never accepted by Twilio, so there is no delivery status to refresh.",
        };
    }

    try {
        const live = await getTwilioWhatsAppMessage({
            accountSid: config.accountSid,
            authToken: config.authToken,
            messageSid: message.twilio_message_sid,
        });
        await db_update_whatsapp_message_status(message.id, orgId, {
            status: live.status || null,
            errorMessage: live.errorMessage,
        });
        const updated = (await db_list_whatsapp_messages(applicationId, orgId)).find(
            (m) => m.id === messageId,
        );
        return {
            success: true,
            message: `Status refreshed from Twilio: “${live.status}”.`,
            sent: updated ? toWhatsappMessageState(updated) : undefined,
        };
    } catch (err) {
        return whatsappFailure(err);
    }
}
