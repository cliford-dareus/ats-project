'use server';

import { auth } from "@clerk/nextjs/server";
import { canCreateCandidate, canDeleteCandidate, canEditCandidate, canViewCandidate, assertCandidateBelongsToOrg } from "@/server/permissions";
import { create_candidate, delete_candidate, get_all_candidates, get_candidate_by_id, get_organization_by_id, update_candidate } from "@/server/queries";
import { CANDIDATE_LIST_SORTS, CandidateListSort } from "@/server/queries/drizzle/candidates";
import { record_activity } from "@/server/activity/record-activity";
import { z } from "zod";
import { CANDIDATE_STATUS, filterCandidateSchema, newCandidateFormSchema, updateCandidateSchema } from "@/zod";
import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

// Audit-log label for a candidate status enum value.
const status_label = (status: z.infer<typeof CANDIDATE_STATUS>) =>
    status === "ACTIVE" ? "Active" : status === "REJECTED" ? "Rejected" : "Hired";

export const create_candidate_action = async (unsafeData: z.infer<typeof newCandidateFormSchema>) => {
    const { userId, orgId } = await auth();
    const allowed = await canCreateCandidate();
    const { success, data } = await newCandidateFormSchema.spa(unsafeData);

    if (!userId || !orgId || !allowed || !success) {
        return { error: true, message: "There was an error creating your candidate" }
    }

    // Never trust client-supplied organization/subdomain — the candidate
    // always belongs to the session org.
    const [org] = await get_organization_by_id(orgId);
    if (!org) {
        return { error: true, message: "Organization not found" }
    }

    return await create_candidate({
        ...data,
        organization: orgId,
        subdomain: org.subdomain,
    });
};

export const update_candidate_action = async (unsafeData: z.infer<typeof updateCandidateSchema>) => {
    const { userId, orgId } = await auth();
    const allowed = await canEditCandidate();
    const { success, data } = await updateCandidateSchema.spa(unsafeData);

    if (!userId || !orgId || !allowed || !success) {
        return { error: true, message: "There was an error updating your candidate" }
    }

    // The query scopes the update to the session org — a candidate from
    // another org is a no-op, never a cross-tenant write.
    // Record a status change only when the status actually changes: this
    // action also saves name/email/phone edits, which are not audited.
    let before: { name: string; status: "ACTIVE" | "REJECTED" | "HIRED" | null } | null = null;
    if (data.status) {
        const [row] = await db
            .select({ name: candidates.name, status: candidates.status })
            .from(candidates)
            .where(and(eq(candidates.id, data.id), eq(candidates.organization, orgId)))
            .limit(1);
        before = row ?? null;
    }

    const result = await update_candidate(data, orgId);

    if (before && data.status && before.status !== data.status) {
        await record_activity({
            action: "candidate.status_changed",
            entity_type: "candidate",
            entity_id: data.id,
            summary: `Changed ${before.name}'s status to ${status_label(data.status)}`,
        });
    }
    return result;
};

export const get_all_candidates_action = async (unsafeData: z.infer<typeof filterCandidateSchema> & { sort?: string }) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewCandidate();
    const { success, data } = await filterCandidateSchema.spa(unsafeData);

    if (!userId || !orgId || !allowed || !success) {
        return { error: true, message: "There was an error retrieving candidates" }
    }
    // `sort` is not part of filterCandidateSchema — validate it against the
    // allowlist here instead of trusting the raw param.
    const sort: CandidateListSort | undefined = CANDIDATE_LIST_SORTS.includes(unsafeData.sort as CandidateListSort)
        ? (unsafeData.sort as CandidateListSort)
        : undefined;
    // Never trust a client-supplied organization filter — always the session org.
    return await get_all_candidates({ ...data, organization: orgId, sort });
};

/**
 * Move a candidate to Trash (soft-delete) — the candidate and its live
 * applications get deleted_at set, nothing is removed, so Restore brings
 * everything back:
 * - MySQL: the candidate row + its live applications (same timestamp).
 *   Interviews, scorecards and Drizzle attachment rows stay in place,
 *   invisible while their application is trashed.
 * - Mongo: candidate details, internal notes and Mongo attachment docs
 *   are KEPT until a permanent delete from Trash (they are what a restore
 *   needs); only the permanent-delete path removes them.
 * NOT deleted: the R2 blobs behind attachment file_urls (same known gap as
 * org deletion — the blobs become unreachable but remain in the bucket).
 * Org-scoped (session org only) and gated on candidate:delete (org:admin).
 */
export const delete_candidate_action = async (unsafeId: number) => {
    const { userId, orgId } = await auth();
    const allowed = await canDeleteCandidate();

    if (!userId || !orgId || !allowed || !Number.isInteger(unsafeId) || unsafeId <= 0) {
        return { error: true, message: "There was an error deleting the candidate" }
    }

    // 404 when the candidate does not exist in the session org — a
    // cross-tenant id is indistinguishable from a missing one. (Trashed
    // candidates read as not found, so this is a no-op for them.)
    const candidate = await assertCandidateBelongsToOrg(unsafeId, orgId).catch(() => null);
    if (!candidate) {
        return { error: true, message: "Candidate not found" }
    }

    const { cascadedApplications } = await delete_candidate(unsafeId, orgId);

    await record_activity({
        action: "candidate.deleted",
        entity_type: "candidate",
        entity_id: unsafeId,
        summary: `Candidate ${candidate.name} moved to Trash` +
            (cascadedApplications > 0
                ? ` (${cascadedApplications} application${cascadedApplications === 1 ? "" : "s"} also moved to Trash)`
                : ""),
    });

    return { success: true, message: `Candidate ${candidate.name} moved to Trash` };
};

/**
 * Set the same status on several candidates at once (list bulk bar).
 * Each id is re-validated through update_candidate, which scopes the
 * write to the session org. Gated on candidate:edit.
 */
export const bulk_update_candidate_status_action = async (
    unsafeIds: number[],
    unsafeStatus: z.infer<typeof CANDIDATE_STATUS>,
) => {
    const { userId, orgId } = await auth();
    const allowed = await canEditCandidate();
    const { success, data: status } = CANDIDATE_STATUS.safeParse(unsafeStatus);

    if (!userId || !orgId || !allowed || !success || !Array.isArray(unsafeIds) || unsafeIds.length === 0) {
        return { error: true, message: "There was an error updating candidates" }
    }

    const ids = [...new Set(unsafeIds)].filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) {
        return { error: true, message: "There was an error updating candidates" }
    }

    // Before-state, so the log only records candidates whose status
    // actually changed (the bulk bar can re-apply the current status).
    const before = await db
        .select({ id: candidates.id, name: candidates.name, status: candidates.status })
        .from(candidates)
        .where(and(inArray(candidates.id, ids), eq(candidates.organization, orgId)));

    await Promise.all(ids.map((id) => update_candidate({ id, status }, orgId)));

    const changed = before.filter((row) => row.status !== status);
    await Promise.all(changed.map((row) =>
        record_activity({
            action: "candidate.status_changed",
            entity_type: "candidate",
            entity_id: row.id,
            summary: `Changed ${row.name}'s status to ${status_label(status)}`,
        })
    ));

    return { success: true, message: `${ids.length} candidate${ids.length === 1 ? "" : "s"} updated` };
};

export const get_candidate_by_id_action = async (unsafeData: number) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewCandidate();

    if (!userId || !allowed || !orgId) {
        return { error: true, message: "There was an error retrieving the candidate" }
    }

    return await get_candidate_by_id(unsafeData, orgId);
};
