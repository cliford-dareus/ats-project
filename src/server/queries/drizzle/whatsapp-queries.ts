// ─────────────────────────────────────────────────────────────────────────────
// server/queries/drizzle/whatsapp-queries.ts — DB access for
// whatsapp_consents + whatsapp_messages. Thin queries only: auth,
// permission and org-scoping live in the server actions that call these.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { whatsapp_consents, whatsapp_messages } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import type { WhatsappConsentState, WhatsappMessageState } from "@/types";

export type WhatsappConsentRow = typeof whatsapp_consents.$inferSelect;
export type WhatsappMessageRow = typeof whatsapp_messages.$inferSelect;

export function toWhatsappConsentState(row: WhatsappConsentRow): WhatsappConsentState {
    return {
        candidateId: row.candidate_id,
        phoneE164: row.phone_e164,
        source: row.source,
        consentedBy: row.consented_by,
        consentedAt: row.consented_at ? row.consented_at.toISOString() : null,
        revokedBy: row.revoked_by,
        revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
        // Consent is "on file" only while granted and not revoked.
        hasConsent: row.consented_at !== null && row.revoked_at === null,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

export function toWhatsappMessageState(row: WhatsappMessageRow): WhatsappMessageState {
    return {
        id: row.id,
        applicationId: row.application_id,
        candidateId: row.candidate_id,
        toPhone: row.to_phone,
        templateContentSid: row.template_content_sid,
        templateVariables: (row.template_variables ?? {}) as Record<string, string>,
        twilioMessageSid: row.twilio_message_sid,
        status: row.status,
        errorMessage: row.error_message,
        sentBy: row.sent_by,
        createdAt: row.created_at ? row.created_at.toISOString() : null,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

/** The consent row for one candidate in one org. Null when none. */
export async function db_get_whatsapp_consent(
    candidateId: number,
    orgId: string,
): Promise<WhatsappConsentRow | null> {
    const [row] = await db
        .select()
        .from(whatsapp_consents)
        .where(
            and(
                eq(whatsapp_consents.candidate_id, candidateId),
                eq(whatsapp_consents.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/**
 * Record (or re-record after a revoke) WhatsApp consent for a candidate.
 * One row per (org, candidate); re-consenting updates the row and clears
 * the revoke. Returns the fresh row.
 */
export async function db_upsert_whatsapp_consent(args: {
    candidateId: number;
    orgId: string;
    phoneE164: string;
    source: string;
    consentedBy: string;
}): Promise<WhatsappConsentRow> {
    const existing = await db_get_whatsapp_consent(args.candidateId, args.orgId);
    const now = new Date();
    if (existing) {
        await db
            .update(whatsapp_consents)
            .set({
                phone_e164: args.phoneE164,
                source: args.source,
                consented_by: args.consentedBy,
                consented_at: now,
                revoked_by: null,
                revoked_at: null,
            })
            .where(eq(whatsapp_consents.id, existing.id));
    } else {
        await db.insert(whatsapp_consents).values({
            organization: args.orgId,
            candidate_id: args.candidateId,
            phone_e164: args.phoneE164,
            source: args.source,
            consented_by: args.consentedBy,
            consented_at: now,
            revoked_by: null,
            revoked_at: null,
        });
    }
    const row = await db_get_whatsapp_consent(args.candidateId, args.orgId);
    // The row must exist — it was just inserted or updated.
    if (!row) throw new Error("Failed to record WhatsApp consent");
    return row;
}

/** Revoke consent (the row stays as the audit record). */
export async function db_revoke_whatsapp_consent(args: {
    candidateId: number;
    orgId: string;
    revokedBy: string;
}): Promise<WhatsappConsentRow | null> {
    const existing = await db_get_whatsapp_consent(args.candidateId, args.orgId);
    if (!existing) return null;
    await db
        .update(whatsapp_consents)
        .set({ revoked_by: args.revokedBy, revoked_at: new Date() })
        .where(eq(whatsapp_consents.id, existing.id));
    return db_get_whatsapp_consent(args.candidateId, args.orgId);
}

/** Sent-message history for one application, newest first. */
export async function db_list_whatsapp_messages(
    applicationId: number,
    orgId: string,
): Promise<WhatsappMessageRow[]> {
    return db
        .select()
        .from(whatsapp_messages)
        .where(
            and(
                eq(whatsapp_messages.application_id, applicationId),
                eq(whatsapp_messages.organization, orgId),
            ),
        )
        .orderBy(desc(whatsapp_messages.created_at));
}

export async function db_insert_whatsapp_message(values: {
    applicationId: number;
    orgId: string;
    candidateId: number;
    toPhone: string;
    templateContentSid: string;
    templateVariables: Record<string, string>;
    twilioMessageSid: string | null;
    status: string | null;
    errorMessage: string | null;
    sentBy: string;
}): Promise<WhatsappMessageRow> {
    await db.insert(whatsapp_messages).values({
        application_id: values.applicationId,
        organization: values.orgId,
        candidate_id: values.candidateId,
        to_phone: values.toPhone,
        template_content_sid: values.templateContentSid,
        template_variables: values.templateVariables,
        twilio_message_sid: values.twilioMessageSid,
        status: values.status,
        error_message: values.errorMessage,
        sent_by: values.sentBy,
    });
    const [row] = await db
        .select()
        .from(whatsapp_messages)
        .where(
            and(
                eq(whatsapp_messages.application_id, values.applicationId),
                eq(whatsapp_messages.organization, values.orgId),
            ),
        )
        .orderBy(desc(whatsapp_messages.id))
        .limit(1);
    if (!row) throw new Error("Failed to record WhatsApp message");
    return row;
}

/** Update one message row's live Twilio status (on-demand refresh). */
export async function db_update_whatsapp_message_status(
    messageId: number,
    orgId: string,
    patch: { status: string | null; errorMessage: string | null },
): Promise<void> {
    await db
        .update(whatsapp_messages)
        .set({ status: patch.status, error_message: patch.errorMessage })
        .where(
            and(
                eq(whatsapp_messages.id, messageId),
                eq(whatsapp_messages.organization, orgId),
            ),
        );
}
