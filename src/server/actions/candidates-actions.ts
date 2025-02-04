import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {get_all_candidates} from "@/server/db/candidates";
import {get_candidate_with_stage} from "@/server/db/application";
import {z} from "zod";
import {filterCandidateType} from "@/schema";

export const get_all_candidates_action = async (unsafeData: z.infer<typeof filterCandidateType>) => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);
    const {success, data} = await filterCandidateType.spa(unsafeData);

    if (!userId || !canCreate || !success) {
        return {error: true, message: "There was an error creating your product"}
    }
    return await get_all_candidates(data);
};

export const get_candidates_stage_count_action = async () => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_candidate_with_stage();
};