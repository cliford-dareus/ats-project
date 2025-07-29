"use client"

import {getPlugins} from "@/lib/plugins-registry";
// import {queries} from "@/drizzle/queries";
// import {organization} from "@/drizzle/schema";
// import {eq} from "drizzle-orm";

export const activatePlugins = async (orgId: string) => {
    // const org = await queries.select().from(organization).where(eq(organization.clerk_id, orgId));
    const plugins = {enabled: ["smart-triggers"]};

    const enabledPlugins = plugins.enabled as string[];
    const registeredPlugins = getPlugins();
    console.log(orgId)

    enabledPlugins.forEach(pluginId => {
        const plugin = registeredPlugins.find(p => p.id === pluginId);
        // plugin?.activate?.(pluginId);
    });
};

export const cleanupPlugins = (orgId: string) => {
    const enabledPlugins: never[] = []/* get from store */;
    console.log(orgId)

    enabledPlugins.forEach(pluginId => {
        const plugin = getPlugins().find(p => p.id === pluginId);
        // plugin?.deactivate?.(pluginId);
    });
};
