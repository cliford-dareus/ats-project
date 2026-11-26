import { ATSPluginRegistry } from "./plugin-registry";
import { initializePluginSystem } from "./initialize-plugins";

// ── Server/worker plugin init ─────────────────────────────────────────────────
// Every call builds a FRESH registry bound to exactly one org and returns it.
// There is deliberately no caching and no `isInitializedForOrg` early return:
// the previous singleton + early-return design let one org's jobs dispatch
// with another org's providers/keys (worker concurrency 5 interleaves jobs
// for different orgs in one long-lived process). Callers must use the
// returned registry for dispatch/fire_integration — never the shared
// client-side `pluginRegistry` singleton.
//
// Called from API routes / server actions (Next.js request context)
export async function initializePluginSystemServer(orgId: string): Promise<ATSPluginRegistry> {
    // Dynamic import keeps Drizzle out of any bundle that imports this file
    const { db_get_org_plugin_state } = await import(
        "@/server/queries/drizzle/plugin-queries"
        );

    const { installed } = await db_get_org_plugin_state(orgId);
    const registry = new ATSPluginRegistry();
    await initializePluginSystem(installed, orgId, registry);
    return registry;
}

// ── Worker version — no Next.js, no server actions ────────────────────────────
export async function initializePluginSystemForWorker(orgId: string): Promise<ATSPluginRegistry> {
    // Import DB query directly — not the server action wrapper
    const { db_get_org_plugin_state } = await import(
        "@/server/queries/drizzle/plugin-queries"
        );

    const { installed } = await db_get_org_plugin_state(orgId);
    const registry = new ATSPluginRegistry();
    await initializePluginSystem(installed, orgId, registry);
    return registry;
}
