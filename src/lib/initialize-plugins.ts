
// ─────────────────────────────────────────────────────────────────────────────
// Called ONCE on the client from PluginSystemProvider.
// Receives pre-filtered InstalledPlugin[] from the server action
// (only enabled + active plugins for this org, with their saved credentials).
// TODO: Hash the credentials before saving
// ─────────────────────────────────────────────────────────────────────────────
import { pluginRegistry } from "./plugin-registry";
import type { InstalledPlugin } from "@/types";

// ── Provider factory map ──────────────────────────────────────────────────────
// Add a new provider here when you add a new plugins/providers/*.ts file.
// Lazy imports keep the bundle from loading unused provider code.
async function getFactory(pluginId: string) {
    switch (pluginId) {
        case "openai-scoring":
        // return (await import("@/plugins/providers/openai-scoring")).createOpenAIScoringProvider;
        case "anthropic-screening":
        // return (await import("@/plugins/providers/anthropic-screening")).createAnthropicScreeningProvider;
        case "calendly":
        // return (await import("@/plugins/providers/others")).createCalendlyProvider;
        case "checkr":
        // return (await import("@/plugins/providers/others")).createCheckrProvider;
        case "slack-notify":
        // return (await import("@/plugins/providers/others")).createSlackNotifyProvider;
        case "resend":
            return (await import("@/plugins/providers/resend")).createResendProvider;
        case "google":
            return (await import("@/plugins/providers/google")).createGoogleProvider;
        default:
            console.warn(`[PluginSystem] No factory for plugin "${pluginId}"`);
            return null;
    }
}

// ── Main bootstrap ────────────────────────────────────────────────────────────
export async function initializePluginSystem(
    installed: InstalledPlugin[],
    orgId?: string
): Promise<void> {
    if (pluginRegistry.isInitialized()) {
        // Already booted — update any newly enabled/disabled providers
        for (const p of pluginRegistry.getAllProviders()) {
            const stillInstalled = installed.find((i) => i.id === p.id);
            if (!stillInstalled) pluginRegistry.unregister(p.id);
        }
    }

    for (const plugin of installed) {
        const factory = await getFactory(plugin.id);
        if (!factory) continue;

        const provider = factory(plugin);
        pluginRegistry.register(provider);
    }

    if (orgId) pluginRegistry.markInitialized(orgId);

    const allEnabled = installed.reduce((acc, plugin) => ({
        ...acc,
        ...plugin.settings.enabledIntegrations,
    }), {} as Record<string, boolean>);

    pluginRegistry.setEnabledIntegrations(allEnabled);

    console.log(
        `[PluginSystem] Initialized with ${pluginRegistry.getAllProviders().length} providers:`,
        pluginRegistry.getAllProviders().map((p) => p.id)
    );
};

