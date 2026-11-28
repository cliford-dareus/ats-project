
// ─────────────────────────────────────────────────────────────────────────────
// Called ONCE on the client from PluginSystemProvider.
// Receives pre-filtered InstalledPlugin[] from the server action
// (only enabled + active plugins for this org). Credentials arrive MASKED
// (•••• + last 4) — the browser never holds a usable key, so client-side
// providers can only report auth status, never execute integrations.
// Real keys live encrypted at rest (AES-256-GCM, see
// src/lib/plugin-encryption.ts) and are decrypted server-side only, at the
// point of use (BullMQ worker dispatch, server-action email sends).
// ─────────────────────────────────────────────────────────────────────────────
import { pluginRegistry, ATSPluginRegistry } from "./plugin-registry";
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
            return (await import("@/plugins/providers/calendly")).createCalendlyProvider;
        case "checkr":
        // return (await import("@/plugins/providers/others")).createCheckrProvider;
        case "slack-notify":
        // return (await import("@/plugins/providers/others")).createSlackNotifyProvider;
        case "resend":
            return (await import("@/plugins/providers/resend")).createResendProvider;
        case "google":
            return (await import("@/plugins/providers/google")).createGoogleProvider;
        case "indeed":
            return (await import("@/plugins/providers/indeed")).createIndeedProvider;
        case "linkedin":
            return (await import("@/plugins/providers/linkedin")).createLinkedInProvider;
        default:
            console.warn(`[PluginSystem] No factory for plugin "${pluginId}"`);
            return null;
    }
}

// ── Main bootstrap ────────────────────────────────────────────────────────────
// `registry` defaults to the client-side singleton. Server/worker callers
// MUST pass a fresh registry per org (see initialize-plugins.server.ts) —
// sharing one registry across orgs would let one org's jobs dispatch with
// another org's providers/keys.
export async function initializePluginSystem(
    installed: InstalledPlugin[],
    orgId?: string,
    registry: ATSPluginRegistry = pluginRegistry,
): Promise<void> {
    if (registry.isInitialized()) {
        // Already booted — update any newly enabled/disabled providers
        for (const p of registry.getAllProviders()) {
            const stillInstalled = installed.find((i) => i.id === p.id);
            if (!stillInstalled) registry.unregister(p.id);
        }
    }

    for (const plugin of installed) {
        const factory = await getFactory(plugin.id);
        if (!factory) continue;

        const provider = factory(plugin);
        registry.register(provider);
    }

    if (orgId) registry.bindOrg(orgId);

    const allEnabled = installed.reduce((acc, plugin) => ({
        ...acc,
        ...plugin.settings.enabledIntegrations,
    }), {} as Record<string, boolean>);

    registry.setEnabledIntegrations(allEnabled);

    console.log(
        `[PluginSystem] Initialized with ${registry.getAllProviders().length} providers:`,
        registry.getAllProviders().map((p) => p.id)
    );
};

