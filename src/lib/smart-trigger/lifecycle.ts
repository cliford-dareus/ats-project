import { StageResponseType } from "@/types";
import { get_job_listings_stages_action } from "@/server/actions/job-listings-actions";
import { add_task_to_queue_action } from "@/server/actions/stage_actions";
import {StageTrigger, TriggerAction} from "@/lib/smart-trigger/types";

export const lifecycle = {
    activate: async (context: any) => {
        if (context.jobId) {
            const stagesData = await get_job_listings_stages_action(Number(context.jobId));
            const validStagesData = Array.isArray(stagesData) ? stagesData : [];
            const parsedTriggers = validStagesData.map(lifecycle.parseTriggerResponse);

            context.setJobStages(validStagesData);
            context.setTriggers(parsedTriggers);
            return {
                validStagesData,
                parsedTriggers
            }
            console.log("Activating Smart Triggers feature");
        }
    },
    deactivate: (context: any) => {
        context.setTriggers([]);
    },
    triggerAction: async (context: any, data: any) => {
        const { applicationId, stageId, stageName, jobId } = data;
        const stageTriggers = context.filter((t: StageTrigger) => t.id === String(stageId));
        await lifecycle.processTriggerActions(applicationId, stageTriggers, stageName, jobId);
    },
    parseTriggerResponse: (stageData: StageResponseType): StageTrigger => {
        try {
            return {
                id: String(stageData.id),
                stage: stageData.stage_name,
                actions: JSON.parse(stageData.trigger) as TriggerAction[]
            };
        } catch (error) {
            console.error(`Failed to parse trigger for stage ${stageData.id}:`, error);
            return {
                id: String(stageData.id),
                stage: stageData.stage_name,
                actions: []
            };
        }
    },
    processTriggerActions: async (
        applicationId: number,
        stageTriggers: StageTrigger[],
        stageName: string,
        jobId: number,
    ) => {
        for (const trigger of stageTriggers) {
            for (const action of trigger.actions) {
                if (action.action_type === null) continue;
                console.log(trigger)
                await add_task_to_queue_action(applicationId, action, stageName, jobId);
            }
        }
    }
};
