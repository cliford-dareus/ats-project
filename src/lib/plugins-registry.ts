'use client'

// import {cleanupPlugins, initializePlugins} from "@/lib/plugin-lifecycle";
// import SmartTriggersFeature from "@/components/smart-trigger-plugin";

import React from "react";
import {StageTrigger} from "@/plugins/smart-trigger/types";

export type PluginConfig = {
    id : string,
    name : string,
    description : string,
    component: React.ComponentType,
    // settingsComponent: React.ComponentType,
    activate?: (context: { setTriggers: (triggers: StageTrigger[]) => void }) => void,
    deactivate?: (context: { setTriggers: (triggers: StageTrigger[]) => void }) => void,
};

const pluginRegistry = new Map<string, PluginConfig>();

export const registerPlugin = (plugin: PluginConfig) => {
  if (pluginRegistry.has(module.id)) {
       throw new Error(`Module with id "${module.id}" is already registered.`);
     }
    pluginRegistry.set(plugin.id, plugin);
};

export const getPlugins = () => Array.from(pluginRegistry.values());