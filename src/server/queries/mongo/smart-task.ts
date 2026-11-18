// NOTE: intentionally NO 'use server' here. These helpers must only be
// reachable through the permission-checked server actions in
// `src/server/actions/*` (get_all_tasks_action, add_task_to_queue_action).
// Adding the directive would expose getTasks/addTaskToQueue as public RPC
// endpoints, bypassing those gates.
import { taskQueue } from "@/lib/queue";
import mongodb from "@/lib/mongodb";
import Trigger from "@/models/trigger";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { milliseconds } from "date-fns";
import { applications, candidates } from "@/drizzle/schema";
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

export const getTasks = async (org_id: string) => {
    await mongodb();
    // Triggers carry no org field — scope through their application, which
    // belongs to exactly one org. Never return cross-org triggers.
    const orgApplications = await db
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.organization, org_id));
    const applicationIds = orgApplications.map((row) => row.id);
    if (applicationIds.length === 0) {
        return JSON.stringify({ tasks: [] });
    }
    const tasks = await Trigger.find({ application_id: { $in: applicationIds } });
    return JSON.stringify({ tasks });
};

// export const cancelTask = async (id: number) => {
// };
