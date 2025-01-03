import {auth} from "@clerk/nextjs/server";
import {filterJobType} from "@/schema";
import {canCreateJob} from "@/server/permissions";
import {get_all_candidates} from "@/server/db/candidates";


export  const get_all_candidates_action = async () => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    const candidates = await get_all_candidates();
    return candidates;
}