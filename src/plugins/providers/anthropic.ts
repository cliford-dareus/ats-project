// Provider: Anthropic  ·  1 on-demand action (no dispatch integration)
//
// Generation is an on-demand server action from the application detail
// page (see src/server/actions/anthropic-actions.ts), not an automation
// trigger — there is no event that should silently spend Claude quota.
// The `interview_scheduled` trigger is never dispatched, so there is
// nothing for an auto-generate integration to run on (same rationale as
// the Calendly provider, which also returns no integrations).

// ── Provider ──────────────────────────────────────────────────────────────────
import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyAnthropic } from "@/server/actions/plugin-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

export class AnthropicProvider implements ATSPluginProvider {
    readonly id = "anthropic-screening";
    readonly name = "Claude Candidate Screening";
    readonly description = "Uses Claude to generate structured interview questions and stage-aware insights.";
    readonly capabilities: PluginCapability[] = ["llm_scoring", "communication"];
    readonly providerColor = "#c96442";

    private authState: PluginAuthState;
    private apiKey: string;
    private orgId: string;

    constructor(installed: InstalledPlugin) {
        const storedKey = installed.settings.credentials?.apiKey ?? "";
        this.orgId = installed.settings.credentials?.orgId ?? "";
        // A stored key arrives MASKED (•••• + last 4) on the client and
        // must never count as verified: a masked value is truthy, so the
        // old `apiKey ? authenticated` check showed "Connected · API
        // verified" on every page load without any verification this
        // session. Only a real, unmasked key authenticates, which only
        // ever happens server-side (decrypted at point of use).
        this.apiKey = is_masked_api_key(storedKey) ? "" : storedKey;
        this.authState = this.apiKey
            ? { status: "authenticated", credentials: installed.settings.credentials }
            : { status: "unauthenticated" };
    }

    getAuthState(): PluginAuthState {
        return this.authState;
    }

    async authenticate(credentials: Record<string, string>): Promise<void> {
        this.authState = { status: "authenticating" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
        try {
            // Validate: GET https://api.anthropic.com/v1/models
            // (returns 200 if the key is valid, 401 if not).
            const result = await verifyAnthropic(credentials.apiKey);
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain a usable key:
            // keep only the MASKED form in registry state (readable via
            // useProviderAuthState()/getAllStates()) and don't store the
            // full key on the instance either. The caller persists it via
            // onSave right after; the encrypted server copy is the only
            // copy. Client-side integrations never execute (display only).
            this.apiKey = "";
            this.authState = { status: "authenticated", credentials: mask_credentials(credentials) };
            pluginRegistry.stateManager.setState(this.id, this.authState);
        } catch (e) {
            this.authState = { status: "error", error: (e as Error).message };
            pluginRegistry.stateManager.setState(this.id, this.authState);
            throw e;
        }
    }

    async deauthenticate(): Promise<void> {
        this.apiKey = "";
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        // No dispatch integrations exist: question generation is an
        // on-demand action on the application page, not a trigger.
        // The `interview_scheduled` trigger is never dispatched, so
        // there is nothing for an auto-generate integration to run on.
        return [];
    }
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createAnthropicProvider = (installed: InstalledPlugin) =>
    new AnthropicProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here in a few lines: a masked display value
// (`••••` + last 4, or the generic `••••••••` shown when decryption
// failed) is NEVER a usable key.
const is_masked_api_key = (value: string): boolean =>
    value.startsWith("••••");

const mask_api_key = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_api_key(value) : value;
    }
    return out;
};
