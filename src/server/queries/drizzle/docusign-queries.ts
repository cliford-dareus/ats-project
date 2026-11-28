// ─────────────────────────────────────────────────────────────────────────────
// server/queries/drizzle/docusign-queries.ts — DB access for
// docusign_envelopes. Thin queries only: auth, permission and
// org-scoping live in the server actions that call these.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { docusign_envelopes } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { DocuSignEnvelopeState } from "@/types";

export type DocuSignEnvelopeRow = typeof docusign_envelopes.$inferSelect;

export function toDocuSignEnvelopeState(row: DocuSignEnvelopeRow): DocuSignEnvelopeState {
    return {
        applicationId: row.application_id,
        environment: row.environment,
        templateId: row.template_id,
        templateRoleName: row.template_role_name,
        envelopeId: row.envelope_id,
        envelopeStatus: row.envelope_status,
        recipientStatus: row.recipient_status,
        recipientName: row.recipient_name,
        recipientEmail: row.recipient_email,
        emailSubject: row.email_subject,
        sentBy: row.sent_by,
        sentAt: row.sent_at ? row.sent_at.toISOString() : null,
        completedAt: row.completed_at ? row.completed_at.toISOString() : null,
        declinedAt: row.declined_at ? row.declined_at.toISOString() : null,
        voidedReason: row.voided_reason,
        errorMessage: row.error_message,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

/** The envelope row for one application, scoped to the org. Null when none. */
export async function db_get_docusign_envelope(
    applicationId: number,
    orgId: string,
): Promise<DocuSignEnvelopeRow | null> {
    const [row] = await db
        .select()
        .from(docusign_envelopes)
        .where(
            and(
                eq(docusign_envelopes.application_id, applicationId),
                eq(docusign_envelopes.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/**
 * Create-or-update the single row per application (unique on
 * application_id). Returns the fresh row.
 */
export async function db_upsert_docusign_envelope(
    values: Omit<DocuSignEnvelopeRow, "id" | "created_at" | "updated_at">,
    patch: Partial<Omit<DocuSignEnvelopeRow, "id" | "application_id" | "organization" | "created_at" | "updated_at">>,
): Promise<DocuSignEnvelopeRow> {
    const existing = await db_get_docusign_envelope(values.application_id, values.organization);
    if (existing) {
        await db
            .update(docusign_envelopes)
            .set({ ...patch })
            .where(eq(docusign_envelopes.id, existing.id));
        const [row] = await db
            .select()
            .from(docusign_envelopes)
            .where(eq(docusign_envelopes.id, existing.id))
            .limit(1);
        return row;
    }
    await db.insert(docusign_envelopes).values(values);
    const [row] = await db
        .select()
        .from(docusign_envelopes)
        .where(eq(docusign_envelopes.application_id, values.application_id))
        .limit(1);
    return row;
}
