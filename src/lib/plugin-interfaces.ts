// ─────────────────────────────────────────────────────────────────────────────
// lib/plugin-interfaces.ts — Zed-inspired trait interfaces
// ATSPluginProvider  ≈  LanguageModelProvider
// ATSIntegration     ≈  LanguageModel
// ─────────────────────────────────────────────────────────────────────────────

import type {
    ATSContext,
    ATSIntegrationResult,
    InstalledPlugin,
    PluginAuthState,
    PluginCapability,
    SmartTrigger,
    TriggerEvent,
} from "../types";

// ── Provider interface ────────────────────────────────────────────────────────
// One per vendor (OpenAI, Anthropic, Calendly, Checkr, Slack…).
// Manages auth state + exposes a list of ATSIntegrations.
export interface ATSPluginProvider {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly capabilities: PluginCapability[];
    readonly logoUrl?: string;
    readonly providerColor?: string;

    getAuthState(): PluginAuthState;
    authenticate(credentials: Record<string, string>): Promise<void>;
    deauthenticate(): Promise<void>;
    getIntegrations(): ATSIntegration[];

    /** Optional React config panel — Zed's configuration_view() */
    ConfigurationView?: React.ComponentType<{ provider: ATSPluginProvider }>;
}

// ── Integration interface ─────────────────────────────────────────────────────
// One per action a provider exposes (resume-score, auto-schedule, etc.).
export interface ATSIntegration {
    readonly id: string;
    readonly name: string;
    readonly providerId: string;
    readonly description: string;
    readonly icon: string;
    readonly latency: "realtime" | "async" | "batch";
    // Display label for who receives this integration's output
    // (e.g. "candidate") — shown in the settings integrations list.
    readonly to?: string;

    getSupportedTriggers(): SmartTrigger[];
    execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult>;
}

// ── Plugin manifest entry (static, used for the DB registry) ─────────────────
// This is what AVAILABLE_PLUGINS contains — lightweight, serialisable,
// no class instances, safe to import on the server.
export interface PluginManifestEntry {
    id: string;
    name: string;
    description: string;
    capabilities: PluginCapability[];
    logoUrl?: string;
    providerColor?: string;
    icon?: string
    /**
     * True only when a real provider exists for this plugin (a factory in
     * src/lib/initialize-plugins.ts + a config UI). Entries without one are
     * "Coming soon": the UI must not offer Install for them and
     * build_org_plugin_state must not report them as installed.
     * Every plugin in the manifest has a provider today.
     */
    hasProvider?: boolean;
}

// ── Factory function type ─────────────────────────────────────────────────────
// Each provider file exports a factory so the registry can instantiate
// providers with their saved credentials from the DB.
export type ProviderFactory = (installed: InstalledPlugin) => ATSPluginProvider;
