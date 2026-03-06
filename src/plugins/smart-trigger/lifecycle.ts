import {get_job_listings_stages_action} from "@/server/actions/job-listings-actions";
import { StageResponseType } from "@/types";
import {StageTrigger, TriggerAction} from "@/plugins/smart-trigger/types";
import { add_task_to_queue_action } from "@/server/actions/stage_actions";

const lifecycle = {
    activate: async (context: any) => {
        if (context.jobId) {
            // Get the triggers from the backend
            const stagesData = await get_job_listings_stages_action(Number(context.jobId));
            const validStagesData = Array.isArray(stagesData) ? stagesData : [];
            const parsedTriggers = validStagesData.map(lifecycle.parseTriggerResponse);

            context.setJobStages(validStagesData);
            context.setTriggers(parsedTriggers);
            console.log("Activating Smart Triggers plugin");
        };
    },
    deactivate: (context: any) => {
        // Clear triggers when deactivated
        context.setTriggers([]);
    },
    triggerAction: async (context: any, data: any) => {
        const { applicationId, stageId, stageName } = data;

        const stageTriggers = context.triggers.filter((t) => t.id === String(stageId));
        await lifecycle.processTriggerActions(applicationId, stageTriggers, stageName);
    },
    parseTriggerResponse : (stageData: StageResponseType): StageTrigger => {
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
              stageName: string
          ) => {
            for (const trigger of stageTriggers) {
                for (const action of trigger.actions) {
                    if (action.action_type === null) continue;
                    await add_task_to_queue_action(applicationId, action, stageName);
                }
            }
          }
};

export default lifecycle;
