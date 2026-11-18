'use server';

import { auth } from "@clerk/nextjs/server";
import { canCreateCandidate, canEditCandidate, canViewCandidate } from "@/server/permissions";
import { create_candidate, get_all_candidates, get_candidate_by_id, get_organization_by_id, update_candidate } from "@/server/queries";
import { get_application_stage } from "@/server/queries";
import { z } from "zod";
import { filterCandidateSchema, newCandidateFormSchema, updateCandidateSchema } from "@/zod";

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

export const get_all_candidates_action = async (unsafeData: z.infer<typeof filterCandidateSchema>) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewCandidate();
    const { success, data } = await filterCandidateSchema.spa(unsafeData);

    if (!userId || !orgId || !allowed || !success) {
        return { error: true, message: "There was an error retrieving candidates" }
    }
    // Never trust a client-supplied organization filter — always the session org.
    return await get_all_candidates({ ...data, organization: orgId });
};

export const get_candidate_by_id_action = async (unsafeData: number) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewCandidate();

    if (!userId || !allowed || !orgId) {
        return { error: true, message: "There was an error retrieving the candidate" }
    }

    return await get_candidate_by_id(unsafeData, orgId);
};

export const get_candidates_stage_count_action = async () => {
    const { userId, orgId } = await auth();
    const allowed = await canViewCandidate();

    if (!userId || !orgId || !allowed) {
        return { error: true, message: "There was an error retrieving candidate stage counts" }
    }

    return await get_application_stage(orgId);
};
