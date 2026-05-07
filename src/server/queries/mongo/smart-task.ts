"use server";

import { taskQueue } from "@/lib/queue";
import mongodb from "@/lib/mongodb";
import Trigger from "@/models/trigger";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { milliseconds } from "date-fns";
import { db } from "@/drizzle/db";
import { stages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";


export const addTaskToQueue = async (id: number, action: TriggerAction, stage_name: string, jobId: number) => {
    await mongodb();
    console.log("Adding task to queue", id, action, stage_name);

    const name = `Task-${action.action_type}-${Date.now()}`;
    const delay = action.config.delay;
    const delayFormat = action.config.delayFormat as 'minutes' | 'hours' | 'days';
    const delayMs = milliseconds({ [`${delayFormat}`]: delay });

    // Get the application stage id from the stage name
    const stageResults = await db.select()
        .from(stages)
        .where(eq(stages.job_id, jobId!));

    const stage = stageResults.find((s) => s.stage_name === action.config.condition.target);
    const stageId = stage?.id;

    const trigger = await Trigger.create({
        stages: stage_name,
        type: action.action_type,
        name,
        triggerTime: new Date(Date.now() + delayMs),
        application_id: id
    });

    await taskQueue.add('executeTask', {
        application_id: id,
        trigger_id: trigger._id,
        type: action.action_type,
        jobId: jobId,
        newStageId: stageId,
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
