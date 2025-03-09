'use client'

// import {cleanupPlugins, initializePlugins} from "@/lib/plugin-lifecycle";
// import SmartTriggersFeature from "@/components/smart-trigger-plugin";

export type PluginConfig = {
    id : string,
    name : string,
    description : string,
    component: React.ComponentType,
    // settingsComponent: React.ComponentType,
    activate?: (orgId: string) => void,
    deactivate?: (orgId: string) => void,
};

const pluginRegistry = new Map<string, PluginConfig>();

export const registerPlugin = (plugin: PluginConfig) => {
  if (pluginRegistry.has(module.id)) {
       throw new Error(`Module with id "${module.id}" is already registered.`);
     }
    pluginRegistry.set(plugin.id, plugin);
};

export const getPlugins = () => Array.from(pluginRegistry.values());