// Provider: Calendly  ·  0 live integrations — manual scheduling only.
//
// REALITY CHECK (read this before "improving" it):
// Calendly books interviews through its API (POST /invitees) with a
// Personal Access Token, and syncs cancellations back via webhooks.
// What this provider deliberately does NOT do:
//   • No stage-triggered "auto-send scheduling links" integration — the
//     old manifest description implied one, but the `interview_scheduled`
//     trigger is never dispatched by interview-actions, so there is
//     nothing to wire it to. Scheduling is a manual per-interview choice
//     in the schedule modal (Google vs Calendly).
//   • No Google Calendar event on the Calendly path: the booking lives
//     in Calendly; availability comes from Calendly; holds (tentative
//     Google blocks) do not exist on this path.
//   • No OAuth flow: PAT covers this build (OAuth 2.1 + PKCE, 2h access
//     tokens with single-use refresh rotation, would be needed only if
//     PAT proved insufficient — it does not).
//
// "authenticated" here means: a PAT was verified against GET /users/me
// THIS session (mirrors the Resend/Google masked-key rule — a stored
// masked `••••` value never counts as verified). The provider holds no
// usable key client-side; the encrypted server copy is the only copy.
//
// Plan honesty: POST /invitees is capped at 5 requests/user/day on
// Calendly Free plans (Paid non-Enterprise 100/day, Enterprise 500/min).
// When the cap is hit the API fails with the real error and no interview
// row is created — the recruiter falls back to the event type's public
// scheduling_url, copied from the modal/config UI.

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyCalendly } from "@/server/actions/plugin-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

/** Calendly's brand color, for the config UI wordmark. */
export const CALENDLY_BRAND_COLOR = "#006bff";

/** Scopes the PAT needs — shown verbatim in the config UI so the
 * recruiter selects them at token creation (new PATs get no API access
 * until scopes are chosen). */
export const CALENDLY_REQUIRED_SCOPES = [
    "users:read",
    "event_types:read",
    "scheduled_events:read",
    "scheduled_events:write",
    "availability:read",
    "webhooks:read",
    "webhooks:write",
] as const;

export class CalendlyProvider implements ATSPluginProvider {
    readonly id = "calendly";
    readonly name = "Calendly";
    readonly description =
        "Book interviews through Calendly: pick one of your real event types in the schedule modal and Applico books the candidate into that slot via the Calendly API. No Google Calendar event is created on this path, and holds are not available — bookings go straight to the candidate's slot.";
    readonly capabilities: PluginCapability[] = ["calendar_integration"];
    readonly providerColor = CALENDLY_BRAND_COLOR;

    private authState: PluginAuthState;
    private apiKey: string;

    constructor(installed: InstalledPlugin) {
        const storedKey = installed.settings.credentials?.apiKey ?? "";
        // Same masked-key rule as Resend: a stored key arrives MASKED
        // (•••• + last 4) on the client and must never count as verified.
        // Only a real, unmasked key authenticates — which only ever
        // happens server-side (decrypted at point of use).
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
            // Verify against the live API: GET /users/me with the PAT.
            // A bad token fails loudly with Calendly's real error.
            const result = await verifyCalendly(credentials.apiKey);
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
        // No dispatch integrations exist: scheduling is a manual
        // per-interview choice in the schedule modal, not a trigger.
        // The `interview_scheduled` trigger is never dispatched, so
        // there is nothing for an auto-send integration to run on.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createCalendlyProvider = (installed: InstalledPlugin) =>
    new CalendlyProvider(installed);

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
