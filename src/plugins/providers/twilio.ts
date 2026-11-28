// Provider: Twilio SMS  ·  0 dispatch integrations — automation action
// + manual send only.
//
// REALITY CHECK (read this before "improving" it):
// Twilio sends plain-text SMS through its Messages API. What this
// provider deliberately does NOT do:
//   • No dispatch integrations — SMS is not fired by a trigger event.
//     It goes through the automation engine's `send_sms` action
//     (src/lib/automation-engine-executor.ts), which resolves the
//     candidate + phone from the DB, checks sms_consents, and sends
//     through the org's Twilio account — or through the manual send
//     card on the application page. Both paths share the same
//     consent + phone checks; there is no second send path here.
//   • No automatic send on stage change — a rule must name send_sms
//     explicitly, and it still refuses to text a candidate with no
//     consent on file (the failure surfaces as
//     automation.execution_failed, never a silent skip).
//   • No MMS, WhatsApp, Verify, or Messaging Service sender —
//     plain-text SMS from the single configured From number only.
//   • No inbound webhook — STOP/START replies are not processed;
//     opt-outs are recorded manually by a recruiter.
//
// "authenticated" here means: the SID/token pair was verified against
// GET /Accounts/{sid}.json THIS session (mirrors the Checkr/Resend
// masked-key rule — a stored masked `••••` value never counts as
// verified). The provider holds no usable key client-side; the
// encrypted server copy is the only copy. The Auth Token is never
// logged, never returned, and only ever sent to Twilio over HTTPS.

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyTwilio } from "@/server/actions/twilio-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

/** Twilio's brand color, for the config UI wordmark. */
export const TWILIO_BRAND_COLOR = "#f22f46";

export class TwilioProvider implements ATSPluginProvider {
    readonly id = "twilio";
    readonly name = "Twilio SMS";
    readonly description =
        "Text candidates via Twilio: automation rules can send SMS, and recruiters can send from the application page — only with the candidate's recorded consent.";
    readonly capabilities: PluginCapability[] = ["communication"];
    readonly providerColor = TWILIO_BRAND_COLOR;

    private authState: PluginAuthState;
    private accountSid: string;

    constructor(installed: InstalledPlugin) {
        const storedSid = installed.settings.credentials?.accountSid ?? "";
        // Same masked-key rule as Checkr/Resend/Calendly: a stored
        // credential arrives MASKED (•••• + last 4) on the client and
        // must never count as verified. Only a real, unmasked SID
        // authenticates — which only ever happens server-side
        // (decrypted at point of use).
        this.accountSid = storedSid.startsWith("••••") ? "" : storedSid;
        this.authState = this.accountSid
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
            // Verify against the live Twilio API: GET /Accounts/{sid}.
            // A bad SID/token fails loudly with Twilio's real error.
            const result = await verifyTwilio(
                credentials.accountSid,
                credentials.authToken,
            );
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain usable
            // credentials: keep only the MASKED form in registry state
            // and don't store the token on the instance either. The
            // caller persists them via onSave right after; the encrypted
            // server copy is the only copy. Client-side integrations
            // never execute (there are none).
            this.accountSid = "";
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
        this.accountSid = "";
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        // No dispatch integrations exist: SMS is sent by the
        // automation engine's send_sms action and the manual card on
        // the application page, both consent-gated — not by a trigger.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createTwilioProvider = (installed: InstalledPlugin) =>
    new TwilioProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER a usable
// credential.
const mask_value = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_value(value) : value;
    }
    return out;
};
