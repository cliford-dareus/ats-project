
import {getPlugins} from "@/lib/plugins-registry";
import {db} from "@/drizzle/db";
import {organization} from "@/drizzle/schema";
import {eq} from "drizzle-orm";

export const initializePlugins = async (orgId: string) => {
    // const org = await db.select().from(organization).where(eq(organization.clerk_id, orgId));
    const plugins = {enabled: ["smart-triggers"]};

    const enabledPlugins = plugins.enabled as string[];
    const registeredPlugins = getPlugins();

    enabledPlugins.forEach(pluginId => {
        const plugin = registeredPlugins.find(p => p.id === pluginId);
        plugin?.activate?.();
    });
};

export const cleanupPlugins = (orgId: string) => {
    const enabledPlugins = []/* get from store */;

    enabledPlugins.forEach(pluginId => {
        const plugin = getPlugins().find(p => p.id === pluginId);
        plugin?.deactivate?.();
    });
};
