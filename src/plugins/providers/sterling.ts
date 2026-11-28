// Provider: Sterling  ·  0 dispatch integrations — manual initiation only.
//
// REALITY CHECK (read this before "improving" it):
// Sterling runs background checks through its Candidate Hub invite
// flow: create a candidate (name + email only), create a screening
// (package id + invite workflow), the candidate completes Sterling's
// flow (PII + consent), then a screening exists. What this provider
// deliberately does NOT do:
//   • No automatic initiation on stage change — the manifest says
//     "when a candidate receives an offer", but initiation is a
//     deliberate recruiter action from the application page, gated on
//     the Offer stage + an explicit FCRA consent confirmation. No
//     automation rule or stage-move hook fires it silently.
//   • No direct screening creation with full PII — that needs SSN/DOB/
//     address Applico does not hold. The invite flow is the only
//     ordering path; SSN/DOB are never collected or sent by Applico.
//   • No live polling and no callback receiver — status is refreshed
//     on demand from the application card. Sterling recommends
//     callbacks over polling; receiving one is a follow-up (outbound
//     webhooks are out of scope for this build).
//   • No cancel action — Sterling documents no DELETE /screenings
//     endpoint; cancellation happens in the Sterling portal.
//   • No adjudication actions from Applico — pre/post adverse action
//     happens in the Sterling portal.
//
// Auth is OAuth2 client credentials, not a single API key: the org
// stores a Client ID + Client Secret (provisioned per region by
// Sterling/First Advantage), and the server exchanges them for a
// 1-hour bearer token at point of use (POST /oauth). The browser
// never holds usable credentials.
//
// "authenticated" here means: the credentials were verified against
// POST /oauth + GET /packages THIS session (mirrors the
// Resend/Google/Calendly masked-key rule — stored masked values never
// count as verified). The provider holds no usable credentials
// client-side; the encrypted server copy is the only copy.
//
// Environment honesty: the credentials are verified against the host
// for the environment selected in settings — test = US Integration
// host (no real checks, no charges), live = US Production host (real
// checks, billable). Test and production use SEPARATE credential sets.
// The configured environment is surfaced on every surface that
// initiates or shows a check; nothing ever silently uses live.
// US only in this build: EMEA/Canada/APAC are production-only and
// need region-specific credentials (see the config UI).

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifySterling } from "@/server/actions/sterling-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";
import type { SterlingEnvironment } from "@/types";

/** Sterling's brand color, for the config UI wordmark. */
export const STERLING_BRAND_COLOR = "#003057";

export class SterlingProvider implements ATSPluginProvider {
    readonly id = "sterling";
    readonly name = "Sterling Background Check";
    readonly description =
        "Initiate background checks via Sterling when a candidate receives an offer.";
    readonly capabilities: PluginCapability[] = ["background_check", "compliance"];
    readonly providerColor = STERLING_BRAND_COLOR;

    private authState: PluginAuthState;
    private clientId: string;
    private clientSecret: string;

    constructor(installed: InstalledPlugin) {
        const storedId = installed.settings.credentials?.clientId ?? "";
        const storedSecret = installed.settings.credentials?.clientSecret ?? "";
        // Same masked-key rule as Resend/Google/Calendly: stored values
        // arrive MASKED (•••• + last 4) on the client and must never
        // count as verified. Only real, unmasked credentials authenticate
        // — which only ever happens server-side (decrypted at point of use).
        this.clientId = storedId.startsWith("••••") ? "" : storedId;
        this.clientSecret = storedSecret.startsWith("••••") ? "" : storedSecret;
        this.authState =
            this.clientId && this.clientSecret
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
            // POST /oauth, then GET /packages. Bad credentials fail
            // loudly with Sterling's real error. The environment comes
            // from the config the caller passes alongside the credentials.
            const environment = (
                credentials.environment === "live" ? "live" : "test"
            ) as SterlingEnvironment;
            const result = await verifySterling(
                credentials.clientId,
                credentials.clientSecret,
                environment,
            );
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain usable
            // credentials: keep only the MASKED form in registry state
            // and don't store the full values on the instance either.
            // The caller persists them via onSave right after; the
            // encrypted server copy is the only copy. Client-side
            // integrations never execute.
            this.clientId = "";
            this.clientSecret = "";
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
        this.clientId = "";
        this.clientSecret = "";
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
export const createSterlingProvider = (installed: InstalledPlugin) =>
    new SterlingProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER a usable key.
const mask_secret = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_secret(value) : value;
    }
    return out;
};
