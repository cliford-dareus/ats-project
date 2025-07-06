"use server";

import {taskQueue} from "@/lib/queue";
import mongodb from "@/lib/mongodb";
import Trigger from "@/models/trigger";
import {TriggerAction} from "@/plugins/smart-trigger/types";


export const addTaskToQueue = async (id: number, action: TriggerAction, stage_name: string) => {
    await mongodb();

    const name = `Task-${action.action_type}-${Date.now()}`;
    const triggerTime = new Date(Date.now() + 2 * 60 * 1000);
    const trigger = await Trigger.create({
        stages: stage_name,
        type: action.action_type,
        name,
        triggerTime,
        application_id: id
    });

    await taskQueue.add('executeTask', {
        trigger_id: trigger._id,
        type: action.action_type,
        config: action.config
    }, {delay: 30000});
};

export const getTasks = async () => {
    await mongodb();
    const tasks = await Trigger.find({});
    return JSON.stringify({tasks: tasks})
};


export const cancelTask = async (id: number) => {
}
