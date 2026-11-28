// Provider: Checkr  ·  0 dispatch integrations — manual initiation only.
//
// REALITY CHECK (read this before "improving" it):
// Checkr runs background checks through its hosted apply flow:
// create/reuse a candidate, create an invitation (package slug), the
// candidate completes Checkr's flow (PII + consent), then a report
// exists. What this provider deliberately does NOT do:
//   • No automatic initiation on stage change — the manifest says
//     "when a candidate receives an offer", but initiation is a
//     deliberate recruiter action from the application page, gated on
//     the Offer stage + an explicit FCRA consent confirmation. No
//     automation rule or stage-move hook fires it silently.
//   • No direct POST /reports — that needs candidate PII + authorization
//     data Applico does not hold. The invitation flow is the only
//     ordering path; SSN/DOB are never collected or sent by Applico.
//   • No live polling and no webhook receiver — report status is
//     refreshed on demand from the application card. Checkr recommends
//     webhooks (report.completed) over polling; registering one is a
//     follow-up (outbound webhooks are out of scope for this build).
//   • No adjudication actions from Applico — pre/post adverse action
//     happens in the Checkr dashboard.
//
// "authenticated" here means: an API key was verified against
// GET /packages THIS session (mirrors the Resend/Google/Calendly
// masked-key rule — a stored masked `••••` value never counts as
// verified). The provider holds no usable key client-side; the
// encrypted server copy is the only copy.
//
// Environment honesty: the key is verified against the host for the
// environment selected in settings — test = api.checkr-staging.com
// (no real checks, no charges), live = api.checkr.com (real checks,
// billable). The configured environment is surfaced on every surface
// that initiates or shows a check; nothing ever silently uses live.

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyCheckr } from "@/server/actions/checkr-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";
import type { CheckrEnvironment } from "@/types";

/** Checkr's brand color, for the config UI wordmark. */
export const CHECKR_BRAND_COLOR = "#7c3aed";

export class CheckrProvider implements ATSPluginProvider {
    readonly id = "checkr";
    readonly name = "Checkr Background Check";
    readonly description =
        "Automatically initiate background checks when a candidate receives an offer.";
    readonly capabilities: PluginCapability[] = ["background_check", "compliance"];
    readonly providerColor = CHECKR_BRAND_COLOR;

    private authState: PluginAuthState;
    private apiKey: string;

    constructor(installed: InstalledPlugin) {
        const storedKey = installed.settings.credentials?.apiKey ?? "";
        // Same masked-key rule as Resend/Google/Calendly: a stored key
        // arrives MASKED (•••• + last 4) on the client and must never
        // count as verified. Only a real, unmasked key authenticates —
        // which only ever happens server-side (decrypted at point of use).
        this.apiKey = storedKey.startsWith("••••") ? "" : storedKey;
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
            // Verify against the live API for the selected environment:
            // GET /packages. A bad key fails loudly with Checkr's real
            // error. The environment comes from the config the caller
            // passes alongside the key.
            const environment = (
                credentials.environment === "live" ? "live" : "test"
            ) as CheckrEnvironment;
            const result = await verifyCheckr(credentials.apiKey, environment);
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain a usable key:
            // keep only the MASKED form in registry state and don't store
            // the full key on the instance either. The caller persists it
            // via onSave right after; the encrypted server copy is the
            // only copy. Client-side integrations never execute.
            this.apiKey = "";
            this.authState = {
                status: "authenticated",
                credentials: mask_credentials(credentials),
            };
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
        // No dispatch integrations exist: initiation is a manual,
        // consent-gated recruiter action on the application page, not a
        // trigger. No automation trigger fires a background check.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createCheckrProvider = (installed: InstalledPlugin) =>
    new CheckrProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER a usable key.
const mask_api_key = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_api_key(value) : value;
    }
    return out;
};
