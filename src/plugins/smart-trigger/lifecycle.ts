// Plugin activation/deactivation logic
import {StageTrigger} from "@/plugins/smart-trigger/types";

export const activate = (context: { setTriggers: (triggers: StageTrigger[]) => void }) => {
    console.log("Activating Smart Triggers plugin");
    context.setTriggers([]);
};

export const deactivate = (context: { setTriggers: (triggers: StageTrigger[]) => void }) => {
    console.log("Deactivating Smart Triggers plugin");
    context.setTriggers([]);
};