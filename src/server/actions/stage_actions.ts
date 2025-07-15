'use server';

import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {add_trigger_to_stage} from "@/server/queries/drizzle/stages";
import {TriggerAction} from "@/plugins/smart-trigger/types";

export const add_trigger_to_stage_action = async (stageId: number, action: TriggerAction) => {
    const {userId} = await auth();
    // const {success, data} = await candidateForm.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

     if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await add_trigger_to_stage(stageId, action);
};
