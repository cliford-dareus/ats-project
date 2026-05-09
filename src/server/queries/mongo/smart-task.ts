"use server";

import { taskQueue } from "@/lib/queue";
import mongodb from "@/lib/mongodb";
import Trigger from "@/models/trigger";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { milliseconds } from "date-fns";

export const addTaskToQueue = async (id: number, action: TriggerAction, jobId: number, stage_name?: string) => {
    await mongodb();
    console.log("Adding task to queue", id, action);

    const name = `Task-${action.action_type}-${Date.now()}`;
    const delay = action.config.delay;
    const delayFormat = action.config.delayFormat as 'minutes' | 'hours' | 'days';
    const delayMs = milliseconds({ [`${delayFormat}`]: delay });

    const trigger = await Trigger.create({
        stages: stage_name,
        type: action.action_type,
        name,
        triggerTime: new Date(Date.now() + delayMs),
        application_id: id
    });

    await taskQueue.add('smart_trigger', {
        application_id: id,
        trigger_id: trigger._id,
        jobId: jobId,
        type: action.action_type,
        new_stage_name: stage_name,
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
