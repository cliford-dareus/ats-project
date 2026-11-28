// ─────────────────────────────────────────────────────────────────────────────
// server/queries/drizzle/twilio-queries.ts — DB access for sms_consents.
// Thin queries only: auth, permission and org-scoping live in the server
// actions (and the automation executor) that call these.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { sms_consents } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { TwilioSmsConsentState } from "@/types";

export type SmsConsentRow = typeof sms_consents.$inferSelect;

export function toTwilioSmsConsentState(row: SmsConsentRow): TwilioSmsConsentState {
    return {
        candidateId: row.candidate_id,
        status: row.status,
        source: row.source,
        recordedBy: row.recorded_by,
        recordedAt: row.recorded_at ? row.recorded_at.toISOString() : null,
        note: row.note,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

/** The consent row for one candidate in one org. Null = no consent ever recorded. */
export async function db_get_sms_consent(
    candidateId: number,
    orgId: string,
): Promise<SmsConsentRow | null> {
    const [row] = await db
        .select()
        .from(sms_consents)
        .where(
            and(
                eq(sms_consents.candidate_id, candidateId),
                eq(sms_consents.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/** True only when a 'consented' row exists for this candidate in this org. */
export async function db_has_sms_consent(
    candidateId: number,
    orgId: string,
): Promise<boolean> {
    const row = await db_get_sms_consent(candidateId, orgId);
    return row?.status === "consented";
}

/**
 * Create-or-update the single row per (candidate, org). Returns the
 * fresh row. Re-recording (opt-out, re-opt-in) updates the row — the
 * activity log (twilio_sms_consent_recorded/revoked) is the history.
 */
export async function db_upsert_sms_consent(
    values: Omit<SmsConsentRow, "id" | "created_at" | "updated_at">,
): Promise<SmsConsentRow> {
    const existing = await db_get_sms_consent(values.candidate_id, values.organization);
    if (existing) {
        await db
            .update(sms_consents)
            .set({
                status: values.status,
                source: values.source,
                recorded_by: values.recorded_by,
                recorded_at: values.recorded_at,
                note: values.note,
            })
            .where(eq(sms_consents.id, existing.id));
        const [row] = await db
            .select()
            .from(sms_consents)
            .where(eq(sms_consents.id, existing.id))
            .limit(1);
        return row;
    }
    await db.insert(sms_consents).values(values);
    const [row] = await db
        .select()
        .from(sms_consents)
        .where(
            and(
                eq(sms_consents.candidate_id, values.candidate_id),
                eq(sms_consents.organization, values.organization),
            ),
        )
        .limit(1);
    return row;
}
