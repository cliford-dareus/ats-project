// ─────────────────────────────────────────────────────────────────────────────
// server/twilio-messaging.ts — the ONE path that texts a candidate.
//
// Shared by the automation engine's send_sms action (worker + server
// action paths) and the manual send card on the application page, so
// both enforce the same gates. This module is worker-safe: no
// "use server", no Clerk import — the org always arrives as an argument
// from a caller that already proved it (session org in server actions,
// queue-verified org in the worker). Auth, permission and org-scoping
// live in those callers; this module only re-resolves facts from the DB.
//
// Gates, in order — every failure throws with a message the caller
// surfaces verbatim (automation: as automation.execution_failed;
// manual card: inline). NOTHING is silently skipped:
//   1. Twilio connected for the org (active plugin + SID/token +
//      sender number, decrypted server-side only).
//   2. Candidate exists in this org (phone comes from the DB-resolved
//      candidate row — never from caller input).
//   3. Consent: a 'consented' row in sms_consents for this candidate
//      in this org. No row, or an opted_out row, refuses to send.
//   4. Phone normalizes to E.164 (Twilio rejects anything else).
//   5. Twilio's real send result — a TwilioApiError propagates with
//      Twilio's own message (trial-account, unverified number, bad
//      sender, 429, …).
//
// The Auth Token is never logged or returned. Activity recording is
// the caller's job (worker-safe record_activity_system in the executor,
// session record_activity in server actions) so the actor is correct
// on each path.
// ─────────────────────────────────────────────────────────────────────────────

import { normalize_phone_e164, sendTwilioSms } from "@/server/twilio";
import { db_get_sms_consent } from "@/server/queries/drizzle/twilio-queries";

/** Twilio's per-message text limit (concatenated SMS). Longer bodies are
 * refused with a clear error rather than silently truncated. */
export const TWILIO_SMS_MAX_LENGTH = 1600;

export type TwilioOrgConfig = {
    accountSid: string;
    authToken: string;
    fromNumber: string;
};

/**
 * Decrypted Twilio settings for one org (server-only use). Mirrors
 * getOrgResendSettings in the automation executor: read the raw blob
 * and decrypt ONLY Twilio's credentials, so another plugin's bad key
 * can never break SMS. Null when the plugin is not active or has no
 * credentials — the caller turns that into its "not connected" error.
 */
export async function loadTwilioOrgConfig(orgId: string): Promise<TwilioOrgConfig | null> {
    try {
        const { db_get_organization_plugins_raw } = await import(
            "@/server/queries/drizzle/plugin-queries"
        );
        const { decrypt_plugin_secret } = await import("@/lib/plugin-encryption");
        const record = await db_get_organization_plugins_raw(orgId);
        const stored = record.settings?.["twilio"];
        if (!stored || stored.active !== true) return null;
        const encryptedSid = stored.credentials?.accountSid;
        const encryptedToken = stored.credentials?.authToken;
        if (!encryptedSid || !encryptedToken) return null;
        const fromNumber =
            typeof stored.config?.fromNumber === "string"
                ? (stored.config.fromNumber as string).trim()
                : "";
        if (!fromNumber) return null;
        try {
            return {
                accountSid: decrypt_plugin_secret(encryptedSid),
                authToken: decrypt_plugin_secret(encryptedToken),
                fromNumber,
            };
        } catch (err) {
            console.warn(
                `[Twilio] Twilio credentials for org ${orgId} could not be decrypted — SMS disabled (${err instanceof Error ? err.message : String(err)})`,
            );
            return null;
        }
    } catch (err) {
        console.warn(
            `[Twilio] Could not load Twilio settings for org ${orgId}:`,
            err instanceof Error ? err.message : String(err),
        );
        return null;
    }
}

export type CandidateSmsTarget = {
    id: number;
    name: string;
    phone: string;
};

/** DB-resolved candidate (id + org), with the phone Applico holds. */
export async function loadCandidateSmsTarget(
    candidateId: number,
    orgId: string,
): Promise<CandidateSmsTarget | null> {
    const { db } = await import("@/drizzle/db");
    const { candidates } = await import("@/drizzle/schema");
    const { and, eq, isNull } = await import("drizzle-orm");
    const [row] = await db
        .select({ id: candidates.id, name: candidates.name, phone: candidates.phone })
        .from(candidates)
        .where(
            and(
                eq(candidates.id, candidateId),
                eq(candidates.organization, orgId),
                isNull(candidates.deleted_at),
            ),
        )
        .limit(1);
    return row ?? null;
}

export type SentSms = {
    messageSid: string;
    to: string;
    from: string;
    status: string;
};

/**
 * Text one candidate. Throws (never silently skips) when Twilio is not
 * connected, the candidate is missing, consent is absent or revoked,
 * the phone is unusable, the message is too long, or Twilio rejects
 * the send. TwilioApiError carries Twilio's real error.
 */
export async function send_candidate_sms(input: {
    orgId: string;
    candidateId: number;
    message: string;
}): Promise<SentSms> {
    const message = input.message?.trim();
    if (!message) {
        throw new Error("Cannot send SMS: message is empty");
    }
    if (message.length > TWILIO_SMS_MAX_LENGTH) {
        throw new Error(
            `Cannot send SMS: message is ${message.length} characters (Twilio limit is ${TWILIO_SMS_MAX_LENGTH}) — shorten it and try again`,
        );
    }

    const config = await loadTwilioOrgConfig(input.orgId);
    if (!config) {
        throw new Error(
            "Twilio SMS is not connected for this organization. Connect it in Settings → Twilio first (Account SID + Auth Token + sender number).",
        );
    }

    const candidate = await loadCandidateSmsTarget(input.candidateId, input.orgId);
    if (!candidate) {
        throw new Error("Cannot send SMS: candidate not found in this organization");
    }

    // Consent gate — a missing row and an opted_out row both refuse.
    // The message names which one it was so the recruiter knows the fix.
    const consent = await db_get_sms_consent(candidate.id, input.orgId);
    if (!consent) {
        throw new Error(
            `Cannot send SMS: ${candidate.name} has not consented to text messages — no message sent. Record consent on the application page first.`,
        );
    }
    if (consent.status !== "consented") {
        throw new Error(
            `Cannot send SMS: ${candidate.name} has opted out of text messages — no message sent.`,
        );
    }

    const to = normalize_phone_e164(candidate.phone);
    if (!to) {
        throw new Error(
            `Cannot send SMS: ${candidate.name}'s phone number "${candidate.phone}" is not a valid phone number (Twilio needs E.164, e.g. +13055550100) — fix it on the candidate record first.`,
        );
    }

    // A TwilioApiError propagates with Twilio's real message.
    const sent = await sendTwilioSms(config.accountSid, config.authToken, {
        to,
        from: config.fromNumber,
        body: message,
    });

    console.log(
        `[Twilio] SMS sent → ${candidate.name} (${to}) via ${config.fromNumber} (SID ${sent.sid}, status ${sent.status})`,
    );
    return {
        messageSid: sent.sid,
        to,
        from: config.fromNumber,
        status: sent.status,
    };
}
