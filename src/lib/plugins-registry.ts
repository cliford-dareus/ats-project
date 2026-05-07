'use server'

import { get_organization_plugins } from "@/server/actions/organization_actions";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";

export const getEnabledPlugins = async (orgId: string) => {
    const plugins = await get_organization_plugins(orgId) as { enabled: string[], settings: any };
    const flags: Record<string, boolean> = {};

    AVAILABLE_PLUGINS.forEach((plugin) => {
        flags[plugin.id] = plugins.enabled?.includes(plugin.id);
    });

    return flags;
};

export const get_extensions_installed = async (orgId: string) => {
    const plugins = await get_organization_plugins(orgId) as { enabled: string[], settings: any };

    // Return an object list of enabled plugins with their settings
    return plugins.enabled?.map((pluginId) => {
        const plugin = AVAILABLE_PLUGINS.find((p) => p.id === pluginId);
        return { ...plugin, id: pluginId, settings: plugins.settings[pluginId] || {} };
    });

};

// Client-safe version (only exposes enabled ones)
export async function useServerFlags(ordId: string) {
    const all = await getEnabledPlugins(ordId);

    return Object.fromEntries(
        Object.entries(all).filter(([, enabled]) => enabled)
    );
};
