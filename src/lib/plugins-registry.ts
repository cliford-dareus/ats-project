'use server'

import {get_organization_plugins} from "@/server/actions/organization_actions";

const getFeaturePlugins = async (orgId: string) => {
    // const user = await getCurrentUser();
    // if (!user) return {};
    const flags: Record<string, boolean> = {};
    const plugins = await get_organization_plugins(orgId) as {enabled: string[], settings: any};

    plugins.enabled.forEach((enabled) => {
        flags[enabled] =  true
    })
    return flags;
};

// Client-safe version (only exposes enabled ones)
export async function useServerFlags(ordId: string) {
    const all = await getFeaturePlugins(ordId);
    return Object.fromEntries(
        Object.entries(all).filter(([, enabled]) => enabled)
    );
};