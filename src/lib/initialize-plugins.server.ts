import { pluginRegistry }     from "./plugin-registry";
import { initializePluginSystem } from "./initialize-plugins";

// Called from API routes (Next.js request context)
export async function initializePluginSystemServer(orgId: string): Promise<void> {
    if (pluginRegistry.isInitializedForOrg(orgId)) return;

    // Dynamic import keeps Drizzle out of any bundle that imports this file
    const { db_get_org_plugin_state } = await import(
        "@/server/queries/drizzle/plugin-queries"
        );

    const { installed } = await db_get_org_plugin_state(orgId);
    await initializePluginSystem(installed, orgId);
}

// ── Worker version — no Next.js, no server actions ────────────────────────────
export async function initializePluginSystemForWorker(orgId: string): Promise<void> {
    if (pluginRegistry.isInitializedForOrg(orgId)) return;

    // Import DB query directly — not the server action wrapper
    const { db_get_org_plugin_state } = await import(
        "@/server/queries/drizzle/plugin-queries"
        );

    const { installed } = await db_get_org_plugin_state(orgId);
    await initializePluginSystem(installed, orgId);
}
