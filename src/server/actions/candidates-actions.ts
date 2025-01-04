import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {get_all_candidates} from "@/server/db/candidates";
import {get_candidate_with_stage} from "@/server/db/application";


export const get_all_candidates_action = async () => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_candidates();
};

export const get_candidates_stage_count_action = async () => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_candidate_with_stage();
};