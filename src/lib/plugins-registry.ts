'use client'

import { get_organization_plugins, update_organization_plugins_action } from "@/server/actions/organization_actions";
import React from "react";

export type PluginConfig = {
    id : string,
    name : string,
    description : string,
    component: React.ComponentType,
    settingsComponent: React.ComponentType,
    actions?: any,
    activate?: (context: any) => Promise<void>,
    deactivate?: (context: any) => void,
    defaultConfig?: any,
};

export type pluginState = {
    enabled: boolean;
    config: PluginConfig;
    orgConfig: any;
};

export const pluginRegistry = new Map<string, pluginState>();

export const registerPlugin = (plugin: PluginConfig) => {
  if (pluginRegistry.has(plugin.id)) {
    throw new Error(`Plugin with id "${plugin.id}" is already registered.`);
  };

  pluginRegistry.set(plugin.id, {
    config: plugin,
    enabled: false,
    orgConfig: plugin.defaultConfig || {},
  });
};

export const getPlugins = () => Array.from(pluginRegistry.entries()).map(([id, state]) => ({
  id,
  ...state,
}));

// Fetch plugins from backend
export const fetchPlugins = async (orgId: string) => {
  const plugins = await get_organization_plugins(orgId) as {enabled: string[], settings: any};

  for (const plugin of plugins.enabled) {
    const existing = pluginRegistry.get(plugin);
    if (existing) {
      existing.enabled = true;
      pluginRegistry.set(plugin, existing);
    }
  };
  return getPlugins();
};

export const togglePlugin = async (pluginId: string, enabled: boolean, orgId: string) => {
  const plugin = pluginRegistry.get(pluginId);

  if (plugin) {
    plugin.enabled = enabled;
    pluginRegistry.set(pluginId, plugin);
    await update_organization_plugins_action(orgId, enabled, pluginId);
  };
};

export const isPluginActive = (pluginId: string) => {
  const plugin = pluginRegistry.get(pluginId);
  return plugin?.enabled || false;
};
