// ─────────────────────────────────────────────────────────────────────────────
// server/queries/drizzle/sterling-queries.ts — DB access for
// sterling_background_checks. Thin queries only: auth, permission and
// org-scoping live in the server actions that call these.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { sterling_background_checks } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { SterlingCheckState, SterlingInviteMethod } from "@/types";

export type SterlingCheckRow = typeof sterling_background_checks.$inferSelect;

export function toSterlingCheckState(row: SterlingCheckRow): SterlingCheckState {
    return {
        applicationId: row.application_id,
        environment: row.environment,
        packageId: row.package_id,
        packageName: row.package_name,
        sterlingCandidateId: row.sterling_candidate_id,
        sterlingScreeningId: row.sterling_screening_id,
        status: row.status,
        subStatus: row.sub_status,
        result: row.result,
        reportUrl: row.report_url,
        inviteUrl: row.invite_url,
        inviteMethod: row.invite_method as SterlingInviteMethod,
        submittedAt: row.submitted_at ? row.submitted_at.toISOString() : null,
        estimatedCompletionAt: row.estimated_completion_at
            ? row.estimated_completion_at.toISOString()
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
export async function db_get_sterling_check(
    applicationId: number,
    orgId: string,
): Promise<SterlingCheckRow | null> {
    const [row] = await db
        .select()
        .from(sterling_background_checks)
        .where(
            and(
                eq(sterling_background_checks.application_id, applicationId),
                eq(sterling_background_checks.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/**
 * Create-or-update the single row per application (unique on
 * application_id). Returns the fresh row.
 */
export async function db_upsert_sterling_check(
    values: Omit<SterlingCheckRow, "id" | "created_at" | "updated_at">,
    patch: Partial<Omit<SterlingCheckRow, "id" | "application_id" | "organization" | "created_at" | "updated_at">>,
): Promise<SterlingCheckRow> {
    const existing = await db_get_sterling_check(values.application_id, values.organization);
    if (existing) {
        await db
            .update(sterling_background_checks)
            .set({ ...patch })
            .where(eq(sterling_background_checks.id, existing.id));
        const [row] = await db
            .select()
            .from(sterling_background_checks)
            .where(eq(sterling_background_checks.id, existing.id))
            .limit(1);
        return row;
    }
    await db.insert(sterling_background_checks).values(values);
    const [row] = await db
        .select()
        .from(sterling_background_checks)
        .where(eq(sterling_background_checks.application_id, values.application_id))
        .limit(1);
    return row;
}
