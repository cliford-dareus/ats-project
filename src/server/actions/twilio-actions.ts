"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/twilio-actions.ts — Twilio SMS candidate messaging.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow / requirePermission) and the application is proven to
// belong to it (assertApplicationBelongsToOrg, 404-style). No
// client-supplied orgId is ever trusted. The Twilio SID/token are
// decrypted server-side only, sent only to Twilio over HTTPS, never
// logged, never returned. Config reads are plugin:manage; manual sends
// and consent recording are application:edit; reads are application:view.
//
// Consent model (see sms_consents, migration 0019): one row per
// (candidate, org). No row = no consent — both the automation send_sms
// action and the manual send below refuse to text the candidate.
// A recruiter records consent here (source 'recruiter', who + when is
// the audit trail); 'apply_form' and 'sms_reply' sources are reserved
// for the apply-form checkbox and an inbound STOP webhook, which do
// not exist yet.
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
import {
    db_get_sms_consent,
    db_upsert_sms_consent,
    toTwilioSmsConsentState,
} from "@/server/queries/drizzle/twilio-queries";
import {
    getTwilioAccount,
    is_twilio_account_sid,
    normalize_phone_e164,
    sendTwilioSms,
    TwilioApiError,
    type TwilioAccount,
} from "@/server/twilio";
import {
    loadTwilioOrgConfig,
    send_candidate_sms,
    TWILIO_SMS_MAX_LENGTH,
} from "@/server/twilio-messaging";
import { record_activity } from "@/server/activity/record-activity";
import { interpolate } from "@/types";
import type {
    SmsConsentStatus,
    TwilioSmsConsentState,
} from "@/types";

function twilioFailure(err: unknown): { success: false; message: string } {
    if (err instanceof TwilioApiError) {
        return { success: false, message: err.detail };
    }
    console.error("Twilio action error:", err);
    return {
        success: false,
        message: (err as Error).message || "Twilio request failed",
    };
}

/**
 * Validate a Twilio SID/token pair with a lightweight call — GET
 * /Accounts/{sid}.json returns 200 for a valid pair, 401 for an
 * invalid one — and return the account's real friendly name, status
 * and type (Trial vs Full) so the config UI can show what was
 * connected. Called from the client-side Twilio provider auth flow
 * (mirrors verifyCheckr / verifySlackWebhook). The credentials are
 * sent only to Twilio, over HTTPS — never logged, never stored here
 * (saving is a separate, encrypting step).
 */
export async function verifyTwilio(
    accountSid: string,
    authToken: string,
): Promise<{
    success: boolean;
    message: string;
    account?: Pick<TwilioAccount, "sid" | "friendly_name" | "status" | "type">;
}> {
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const sid = accountSid?.trim();
    const token = authToken?.trim();
    if (!sid || !token) {
        return { success: false, message: "Account SID and Auth Token are required" };
    }
    if (!is_twilio_account_sid(sid)) {
        return {
            success: false,
            message: "Account SID must look like AC + 32 hex characters (find it in the Twilio console)",
        };
    }

    try {
        const account = await getTwilioAccount(sid, token);
        return {
            success: true,
            message: `Connected to Twilio as "${account.friendly_name}" (${account.type} account, status: ${account.status})`,
            account: {
                sid: account.sid,
                friendly_name: account.friendly_name,
                status: account.status,
                type: account.type,
            },
        };
    } catch (err) {
        console.error("Twilio credential verification error:", err);
        return twilioFailure(err);
    }
}

/**
 * Send a real test SMS through the org's SAVED Twilio credentials
 * (decrypted server-side — the browser never sees them) to a phone
 * number the admin types in settings. Requires plugin:manage. The
 * reply carries Twilio's real result (message SID + queued status)
 * or Twilio's real error — a trial account texting an unverified
 * number fails here with Twilio's 21211, exactly as a real send would.
 */
export async function testTwilioSms(
    toPhone: string,
): Promise<{ success: boolean; message: string; messageSid?: string; status?: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    const to = normalize_phone_e164(toPhone);
    if (!to) {
        return {
            success: false,
            message: "Enter a valid test phone number in E.164 format (e.g. +13055550100)",
        };
    }

    const config = await loadTwilioOrgConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Connect Twilio first (Account SID + Auth Token + sender number in Settings → Twilio)",
        };
    }

    try {
        const sent = await sendTwilioSms(config.accountSid, config.authToken, {
            to,
            from: config.fromNumber,
            body: "Applico test message — your Twilio connection works. Do not reply.",
        });
        return {
            success: true,
            message: `Test SMS sent to ${to} (Twilio SID ${sent.sid}, status: ${sent.status})`,
            messageSid: sent.sid,
            status: sent.status,
        };
    } catch (err) {
        return twilioFailure(err);
    }
}

type ApplicationSmsContext = {
    applicationId: number;
    candidateId: number;
    candidateName: string;
    candidatePhone: string;
    jobTitle: string;
};

async function loadApplicationSmsContext(
    applicationId: number,
    orgId: string,
): Promise<ApplicationSmsContext | null> {
    const [row] = await db
        .select({
            id: applications.id,
            candidateId: candidates.id,
            candidateName: candidates.name,
            candidatePhone: candidates.phone,
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
        applicationId: row.id,
        candidateId: row.candidateId,
        candidateName: row.candidateName,
        candidatePhone: row.candidatePhone ?? "",
        jobTitle: row.jobTitle ?? "",
    };
}

/** SMS card state for one application: consent, plugin, and the
 * DB-resolved destination. Read-only values only — credentials are
 * never in the response. */
export async function get_twilio_sms_state_action(applicationId: number): Promise<{
    consent: TwilioSmsConsentState | null;
    pluginEnabled: boolean;
    fromNumber: string;
    candidateName: string;
    candidatePhone: string;
    jobTitle: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadTwilioOrgConfig(orgId);
    const ctx = await loadApplicationSmsContext(applicationId, orgId);
    const row = ctx ? await db_get_sms_consent(ctx.candidateId, orgId) : null;
    return {
        consent: row ? toTwilioSmsConsentState(row) : null,
        pluginEnabled: config !== null,
        fromNumber: config?.fromNumber ?? "",
        candidateName: ctx?.candidateName ?? "",
        candidatePhone: ctx?.candidatePhone ?? "",
        jobTitle: ctx?.jobTitle ?? "",
    };
}

/**
 * Record (or revoke) a candidate's SMS consent. Deliberate recruiter
 * action only — never automatic, and never inferred from an email
 * opt-in. The recorder (Clerk user id) and time are the audit trail.
 * The consent row is per candidate per org, keyed off the application
 * (DB-resolved) — the browser never supplies a candidate id.
 */
export async function record_twilio_sms_consent_action(
    applicationId: number,
    input: { status: SmsConsentStatus; note?: string },
): Promise<{ success: boolean; message: string; consent?: TwilioSmsConsentState }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    if (input.status !== "consented" && input.status !== "opted_out") {
        return { success: false, message: "Consent status must be consented or opted_out" };
    }

    const ctx = await loadApplicationSmsContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }

    const note = input.note?.trim().slice(0, 500) || null;
    const row = await db_upsert_sms_consent({
        candidate_id: ctx.candidateId,
        organization: orgId,
        status: input.status,
        source: "recruiter",
        recorded_by: userId,
        recorded_at: new Date(),
        note,
    });

    await record_activity({
        action:
            input.status === "consented"
                ? "twilio_sms_consent_recorded"
                : "twilio_sms_consent_revoked",
        entity_type: "application",
        entity_id: applicationId,
        summary:
            input.status === "consented"
                ? `SMS consent recorded for ${ctx.candidateName} (recruiter-recorded${note ? `: ${note}` : ""}).`
                : `SMS consent revoked for ${ctx.candidateName} — the candidate will no longer receive text messages${note ? ` (${note})` : ""}.`,
    });

    return {
        success: true,
        message:
            input.status === "consented"
                ? `Consent recorded — ${ctx.candidateName} can now receive text messages.`
                : `Opt-out recorded — ${ctx.candidateName} will no longer receive text messages.`,
        consent: toTwilioSmsConsentState(row),
    };
}

/**
 * Manual send from the application page. Same gates as the automation
 * path (shared send_candidate_sms core): Twilio connected, consent on
 * file, usable phone, Twilio's real result. Supports the same
 * {{candidate.name}} / {{job.title}} tokens as automation messages.
 * A failed send returns Twilio's real error and records nothing as
 * sent; a success is logged to the activity feed.
 */
export async function send_twilio_sms_action(
    applicationId: number,
    input: { message: string },
): Promise<{ success: boolean; message: string; messageSid?: string; status?: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const ctx = await loadApplicationSmsContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }

    const raw = input.message?.trim() ?? "";
    if (!raw) {
        return { success: false, message: "Message is required" };
    }
    if (raw.length > TWILIO_SMS_MAX_LENGTH) {
        return {
            success: false,
            message: `Message is ${raw.length} characters (Twilio limit is ${TWILIO_SMS_MAX_LENGTH}) — shorten it and try again`,
        };
    }

    const message = interpolate(raw, {
        "candidate.name": ctx.candidateName,
        "candidate.id": String(ctx.candidateId),
        "job.title": ctx.jobTitle,
    });

    try {
        const sent = await send_candidate_sms({
            orgId,
            candidateId: ctx.candidateId,
            message,
        });

        await record_activity({
            action: "twilio_sms_sent",
            entity_type: "application",
            entity_id: applicationId,
            summary: `SMS sent to ${ctx.candidateName} (${sent.to}) via Twilio (SID ${sent.messageSid}, status: ${sent.status}): "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}"`,
        });

        return {
            success: true,
            message: `SMS sent to ${ctx.candidateName} (Twilio SID ${sent.messageSid}, status: ${sent.status})`,
            messageSid: sent.messageSid,
            status: sent.status,
        };
    } catch (err) {
        return twilioFailure(err);
    }
}
