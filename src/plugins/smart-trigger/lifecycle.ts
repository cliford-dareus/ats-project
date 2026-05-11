import { StageResponseType } from "@/types";
import { get_job_listings_stages_action } from "@/server/actions/job-listings-actions";
import { add_task_to_queue_action } from "@/server/actions/stage_actions";
import { StageTrigger, TriggerAction } from "@/plugins/smart-trigger/types";
import { getEnabledPlugins } from "@/lib/plugins-registry";

export const smartTriggerLifecycle = {
    isEnabled: async (orgId: string): Promise<boolean> => {
        const plugins = await getEnabledPlugins(orgId);
        console.log(plugins);
        return plugins.smart_triggers === true;
    },

    activate: async (context: any) => {
        const { orgId, jobId } = context;

        if (!orgId || !jobId) return;

        const isEnabled = await smartTriggerLifecycle.isEnabled(orgId);
        if (!isEnabled) {
            context.setTriggers?.([]);
            return { enabled: false };
        }

        console.log("✅ Smart Triggers Activated");

        const stagesData = await get_job_listings_stages_action(Number(jobId));
        const validStagesData = Array.isArray(stagesData) ? stagesData : [];

        const parsedTriggers = validStagesData.map(smartTriggerLifecycle.parseTriggerResponse);

        context.setJobStages?.(validStagesData);
        context.setTriggers?.(parsedTriggers);

        return {
            enabled: true,
            validStagesData,
            parsedTriggers
        };
    },

    deactivate: (context: any) => {
        context.setTriggers?.([]);
        console.log("⛔ Smart Triggers Deactivated");
    },

    triggerAction: async (context: any, data: any) => {
        const isEnabled = await smartTriggerLifecycle.isEnabled(context.orgId);
        if (!isEnabled) return;

        const { applicationId, stageId, stageName, jobId } = data;
        const stageTriggers = context.filter?.((t: StageTrigger) => t.id === String(stageId));
        console.log('triggerAction', context, stageTriggers);

        await smartTriggerLifecycle.processTriggerActions(
            applicationId,
            stageTriggers,
            stageName,
            jobId
        );
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
            return { id: String(stageData.id), stage: stageData.stage_name, actions: [] };
        }
    },

    processTriggerActions: async (
        applicationId: number,
        stageTriggers: StageTrigger[],
        stageName: string,
        jobId: number,
    ) => {
        const actions = stageTriggers.flatMap(t => t.actions);
   
        for (const action of actions) {
            if (action.action_type === null) continue;
            console.log("TRIGGER", action);
            await add_task_to_queue_action({ applicationId, action, stageName, jobId });
        }
    }
};
