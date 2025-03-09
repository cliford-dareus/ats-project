'use client'

import {cleanupPlugins, initializePlugins} from "@/lib/plugin-lifecycle";
import SmartTriggersFeature from "@/components/smart-trigger-plugin";

type Plugin = {
    id : string,
    name : string,
    description : string,
    component: React.ComponentType,
    // settingsComponent: React.ComponentType,
    activate?: (orgId: string) => void,
    deactivate?: (orgId: string) => void,
};

const pluginRegistry = new Map<string, Plugin>([
    ["smart-trigger", {
        id: "smart-trigger",
        name: "Smart Trigger",
        description: "This plugin allows you to create and manage smart triggers.",
        component: SmartTriggersFeature,
        // settingsComponent: () => `<div></div>`,
        activate: initializePlugins,
        deactivate: cleanupPlugins,
    }]
]);

export const getPlugins = () => Array.from(pluginRegistry.values());