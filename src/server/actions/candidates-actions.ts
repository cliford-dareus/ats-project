'use server';

import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {create_candidate, get_all_candidates, get_candidate_by_id} from "@/server/queries";
import {get_application_stage} from "@/server/queries";
import {z} from "zod";
import {filterCandidateType, newCandidateForm} from "@/zod";

export const create_candidate_action = async (unsafeData: z.infer<typeof newCandidateForm>) => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);
    const {success, data} = await newCandidateForm.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return {error: true, message: "There was an error creating your candidate"}
    }

    return await create_candidate(data);
};

export const get_all_candidates_action = async (unsafeData: z.infer<typeof filterCandidateType>) => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);
    const {success, data} = await filterCandidateType.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return {error: true, message: "There was an error creating your product"}
    }
    return await get_all_candidates(data);
};

export const get_candidate_by_id_action = async (unsafeData: number) => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_candidate_by_id(unsafeData);
};

export const get_candidates_stage_count_action = async () => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_application_stage();
};
