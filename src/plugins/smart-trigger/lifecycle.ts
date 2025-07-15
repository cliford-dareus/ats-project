import {pluginRegistry} from "@/lib/plugins-registry";
import {getJobListingsStagesAction} from "@/server/actions/job-listings-actions";
import {TriggerAction} from "@/plugins/smart-trigger/types";

export const lifecycle = {
  activate: async (context) => {
    if (true) {
        const jobId = context.JobId;
        if (!jobId) {
            console.log("No job id");
            return;
        };
        // Get the triggers from the backend
        const result = await getJobListingsStagesAction(jobId);
        const response = Array.isArray(result) ? result : [];
        console.log("response", response);

        const parsedTriggers = response.map(cur => ({
            id: String(cur.id),
            stage: cur.stage_name,
            actions: JSON.parse(cur.trigger) as TriggerAction[]
        }));
      context.setTriggers(parsedTriggers);
    }
    console.log("Activating Smart Triggers plugin", context.triggers);
  },

  deactivate: (context) => {
    // Clear triggers when deactivated
    context.setTriggers([]);
  },
};
