'use server';

import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {add_trigger_to_stage, get_stage_by_name} from "@/server/queries/drizzle/stages";
import {TriggerAction} from "@/plugins/smart-trigger/types";
import { addTaskToQueue } from "../queries";

export const get_stage_by_name_action = async (stageName: string) => {
    const {userId} = await auth();
    if (!userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_stage_by_name(stageName);
};

export const add_trigger_to_stage_action = async (stageId: number, action: TriggerAction) => {
    const {userId} = await auth();
    // const {success, data} = await candidateForm.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await add_trigger_to_stage(stageId, action);
};

// MOVE LATER
export const add_task_to_queue_action = async (applicationId: number, action: TriggerAction, stageName: string, jobId: number) => {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await addTaskToQueue(applicationId, action, stageName, jobId);
};
