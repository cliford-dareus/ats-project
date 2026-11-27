'use server';

import { auth } from "@clerk/nextjs/server";
import { canCreateCandidate, canDeleteCandidate, canEditCandidate, canViewCandidate, assertCandidateBelongsToOrg } from "@/server/permissions";
import { create_candidate, delete_candidate, get_all_candidates, get_candidate_by_id, get_organization_by_id, update_candidate } from "@/server/queries";
import { CANDIDATE_LIST_SORTS, CandidateListSort } from "@/server/queries/drizzle/candidates";
import { delete_candidate_details } from "@/server/queries/mongo/candidate-details";
import { delete_candidate_notes } from "@/server/queries/mongo/note";
import { delete_candidate_attachments } from "@/server/queries/mongo/attachment";
import { z } from "zod";
import { CANDIDATE_STATUS, filterCandidateSchema, newCandidateFormSchema, updateCandidateSchema } from "@/zod";

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
    return await update_candidate(data, orgId);
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
 * Delete a candidate and everything linked to them — explicit cascade,
 * nothing silently orphaned:
 * - MySQL (declared onDelete: 'cascade' in the schema): the candidate's
 *   applications, their interviews and scorecards, and Drizzle attachment rows.
 * - Mongo (no FKs): candidate details, internal notes
 *   (note_id "candidate_<id>" / legacy "canditates_<id>"), and Mongo
 *   attachment docs written by the upload route.
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
    // cross-tenant id is indistinguishable from a missing one.
    const candidate = await assertCandidateBelongsToOrg(unsafeId, orgId).catch(() => null);
    if (!candidate) {
        return { error: true, message: "Candidate not found" }
    }

    // Mongo documents first (they have no FK cascade to the MySQL row).
    await delete_candidate_details(unsafeId);
    await delete_candidate_notes(unsafeId);
    await delete_candidate_attachments(unsafeId);

    // MySQL row delete cascades to applications, interviews, scorecards
    // and Drizzle attachment rows via the schema's onDelete: 'cascade'.
    await delete_candidate(unsafeId, orgId);

    return { success: true, message: `Candidate ${candidate.name} deleted` };
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

    await Promise.all(ids.map((id) => update_candidate({ id, status }, orgId)));

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
