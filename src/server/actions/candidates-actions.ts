'use server';

import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";
import { create_candidate, get_all_candidates, get_candidate_by_id, update_candidate } from "@/server/queries";
import { get_application_stage } from "@/server/queries";
import { z } from "zod";
import { filterCandidateSchema, newCandidateFormSchema, updateCandidateSchema } from "@/zod";

export const create_candidate_action = async (unsafeData: z.infer<typeof newCandidateFormSchema>) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);
    const { success, data } = await newCandidateFormSchema.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return { error: true, message: "There was an error creating your candidate" }
    }

    return await create_candidate(data);
};

export const update_candidate_action = async (unsafeData: z.infer<typeof updateCandidateSchema>) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);
    const { success, data } = await updateCandidateSchema.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return { error: true, message: "There was an error updating your candidate" }
    }

    return await update_candidate(data);
};

export const get_all_candidates_action = async (unsafeData: z.infer<typeof filterCandidateSchema>) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);
    const { success, data } = await filterCandidateSchema.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return { error: true, message: "There was an error creating your product" }
    }
    return await get_all_candidates(data);
};

export const get_candidate_by_id_action = async (unsafeData: number) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_candidate_by_id(unsafeData);
};

export const get_candidates_stage_count_action = async () => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_application_stage();
};
