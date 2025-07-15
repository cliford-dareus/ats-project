import {PluginConfig} from "@/lib/plugins-registry";
import React from "react";
import {StageTrigger} from "./types";
import {lifecycle} from "@/plugins/smart-trigger/lifecycle";

const DEFAULT_TRIGGERS: StageTrigger[] = [
    {
        id: "1",
        stage: "Applied",
        actions: [
            {
                action_type: "MESSAGE",
                config: { template: "welcome-email" }
            }
        ]
    }
];

const SmartTriggers = () => {
    // const {triggers} = useTriggers();

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Smart Triggers</h2>
            <p className="text-gray-600 mb-6">
                Automate your recruitment workflows with Smart Triggers.
            </p>

            {/* <div className="space-y-4">
                <h3 className="font-semibold">Active Triggers ({triggers.length})</h3>
                <ul className="space-y-2">
                    {triggers.map((trigger) => (
                        <li key={trigger.id} className="p-3 border rounded">
                            <span className="font-medium">{trigger.stage}</span>
                            <span className="text-sm text-gray-500 ml-2">
                ({trigger.actions.length} actions)
              </span>
                        </li>
                    ))}
                </ul>
            </div> */}
        </div>
    );
};

const pluginConfig = {
    id: "smart-triggers",
    name: "Smart Triggers",
    description: "Automate recruitment workflows with triggers.",
    version: "1.0.0",
    component: SmartTriggers,
    settingsComponent: SmartTriggers,
    activate: lifecycle.activate,
    deactivate: lifecycle.deactivate,
    defaultConfig: {
        triggers: DEFAULT_TRIGGERS,
    },
} as PluginConfig;

export default pluginConfig;
