// ─────────────────────────────────────────────────────────────────────────────
// server/queries/drizzle/checkr-queries.ts — DB access for
// checkr_background_checks. Thin queries only: auth, permission and
// org-scoping live in the server actions that call these.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { checkr_background_checks } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { CheckrCheckState } from "@/types";

export type CheckrCheckRow = typeof checkr_background_checks.$inferSelect;

export function toCheckrCheckState(row: CheckrCheckRow): CheckrCheckState {
    return {
        applicationId: row.application_id,
        environment: row.environment,
        packageSlug: row.package_slug,
        checkrCandidateId: row.checkr_candidate_id,
        checkrInvitationId: row.checkr_invitation_id,
        checkrReportId: row.checkr_report_id,
        invitationStatus: row.invitation_status,
        reportStatus: row.report_status,
        reportResult: row.report_result,
        adjudication: row.adjudication,
        invitationUrl: row.invitation_url,
        invitationExpiresAt: row.invitation_expires_at
            ? row.invitation_expires_at.toISOString()
            : null,
        reportCompletedAt: row.report_completed_at
            ? row.report_completed_at.toISOString()
            : null,
        consentConfirmedBy: row.consent_confirmed_by,
        consentConfirmedAt: row.consent_confirmed_at
            ? row.consent_confirmed_at.toISOString()
            : null,
        errorMessage: row.error_message,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

/** The check row for one application, scoped to the org. Null when none. */
export async function db_get_checkr_check(
    applicationId: number,
    orgId: string,
): Promise<CheckrCheckRow | null> {
    const [row] = await db
        .select()
        .from(checkr_background_checks)
        .where(
            and(
                eq(checkr_background_checks.application_id, applicationId),
                eq(checkr_background_checks.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/**
 * Create-or-update the single row per application (unique on
 * application_id). Returns the fresh row.
 */
export async function db_upsert_checkr_check(
    values: Omit<CheckrCheckRow, "id" | "created_at" | "updated_at">,
    patch: Partial<Omit<CheckrCheckRow, "id" | "application_id" | "organization" | "created_at" | "updated_at">>,
): Promise<CheckrCheckRow> {
    const existing = await db_get_checkr_check(values.application_id, values.organization);
    if (existing) {
        await db
            .update(checkr_background_checks)
            .set({ ...patch })
            .where(eq(checkr_background_checks.id, existing.id));
        const [row] = await db
            .select()
            .from(checkr_background_checks)
            .where(eq(checkr_background_checks.id, existing.id))
            .limit(1);
        return row;
    }
    await db.insert(checkr_background_checks).values(values);
    const [row] = await db
        .select()
        .from(checkr_background_checks)
        .where(eq(checkr_background_checks.application_id, values.application_id))
        .limit(1);
    return row;
}
