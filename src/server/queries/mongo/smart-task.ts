"use server";

import { taskQueue } from "@/lib/queue";
import mongodb from "@/lib/mongodb";
import Trigger from "@/models/trigger";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { milliseconds } from "date-fns";
import { candidates } from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { eq } from "drizzle-orm";

type AddTaskToQueueActionParams = {
    applicationId: number;
    action: TriggerAction;
    jobId: number;
    stageName?: string;
};

export const addTaskToQueue = async ({ applicationId, action, jobId, stageName }: AddTaskToQueueActionParams) => {
    await mongodb();
    const { location } = action.config.condition ?? {};
    console.log("Adding task to queue", applicationId, action);

    const name = `Task-${action.action_type}-${Date.now()}`;
    const delay = action.config.delay;
    const delayFormat = action.config.delayFormat as 'minutes' | 'hours' | 'days';
    const delayMs = milliseconds({ [`${delayFormat}`]: delay });
    
    const [candidate] = await db.select()
        .from(candidates)
        .where(eq(candidates.id, applicationId))
        .limit(1);
    if (!candidate) return;

    // Check if the action condition is met
    // before adding the task to the queue
    if (action.action_type == "MOVE" && location !== candidate.city) {
        return;
    };

    const trigger = await Trigger.create({
        stages: stageName,
        type: action.action_type,
        name,
        triggerTime: new Date(Date.now() + delayMs),
        application_id: applicationId
    });

    await taskQueue.add('smart_trigger', {
        application_id: applicationId,
        trigger_id: trigger._id,
        jobId: jobId,
        type: action.action_type,
        new_stage_name: stageName,
        config: action.config
    }, { delay: delayMs });
};

export const getTasks = async () => {
    await mongodb();
    const tasks = await Trigger.find({});
    return JSON.stringify({ tasks });
};

// export const cancelTask = async (id: number) => {
// };
