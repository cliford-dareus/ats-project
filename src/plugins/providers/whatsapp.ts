// Provider: WhatsApp Business messaging (via Twilio) · 0 dispatch
// integrations — manual send only.
//
// TRANSPORT DECISION — Twilio's WhatsApp API, not Meta's WhatsApp
// Business (Cloud) API directly:
//   • Same account shape as the Twilio SMS plugin (built in parallel):
//     Account SID + Auth Token, same Messages API, only the address
//     format changes (`+1555…` vs `whatsapp:+1555…`). One Twilio
//     account serves both channels; no Meta app review, no separate
//     WhatsApp Business Account, no phone-number-id / permanent-token
//     management. Twilio handles sender registration and template
//     submission (Content Template Builder).
//   • OWN credentials, NOT shared with the SMS plugin: the SMS plugin
//     does not exist in this tree yet, so there is nothing clean to
//     share — and silently reading another plugin's stored credentials
//     would cross plugin boundaries and break the per-plugin
//     allowlist/encryption model. If the org uses the same Twilio
//     account for SMS, they paste the same SID/token here; it is stored
//     separately under `whatsapp`, encrypted the same way. A future
//     shared-account model would need an explicit cross-plugin
//     credential reference, not a silent read.
//
// TEMPLATE / SESSION RULES (Twilio docs, Nov 2026):
//   • Business-initiated messages outside the 24-hour customer-service
//     window MUST use an approved template, sent via ContentSid +
//     ContentVariables. Since 2025-04-01 a template sent as Body outside
//     the window fails with error 63016.
//   • Applico has NO inbound WhatsApp webhook, so it can never know
//     whether the window is open. This build therefore sends ONLY
//     templates — there is deliberately NO free-form Body path.
//   • Templates must be created in Twilio's Content Template Builder
//     and approved by Meta before they can deliver; the config UI says
//     so, and the send card only ever sends a Content SID.
//
// WHY NO AUTOMATION INTEGRATION (mirrors Checkr's 0-integration shape):
//   • WhatsApp messages are billable per conversation and consent-gated.
//     Auto-firing on a stage move risks messaging a candidate who never
//     consented, or spamming them on every move. Sending is a deliberate
//     recruiter action from the application card, gated on consent on
//     file. An automation integration is a follow-up once opt-out /
//     inbound handling exists.
//
// "authenticated" here means: the Account SID + Auth Token were verified
// against GET /Accounts/{sid}.json THIS session (mirrors the
// Resend/Google/Calendly masked-key rule — a stored masked `••••` value
// never counts as verified). Verification proves the ACCOUNT, not the
// WhatsApp sender: Twilio has no read-only "is this number a registered
// WhatsApp sender" call, so a wrong/unregistered From number fails at
// send time with Twilio's real error. The provider holds no usable
// token client-side; the encrypted server copy is the only copy.

import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyWhatsapp } from "@/server/actions/whatsapp-actions";
import type { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import type {
    InstalledPlugin,
    PluginAuthState,
    PluginCapability,
} from "@/types";

/** WhatsApp's brand color, for the config UI wordmark. */
export const WHATSAPP_BRAND_COLOR = "#25d366";

export class WhatsappProvider implements ATSPluginProvider {
    readonly id = "whatsapp";
    readonly name = "WhatsApp Business";
    readonly description =
        "Message candidates on WhatsApp via Twilio using approved templates — consent-gated, one deliberate send at a time.";
    readonly capabilities: PluginCapability[] = ["communication"];
    readonly providerColor = WHATSAPP_BRAND_COLOR;

    private authState: PluginAuthState;
    private accountSid: string;

    constructor(installed: InstalledPlugin) {
        const storedSid = installed.settings.credentials?.accountSid ?? "";
        // Same masked-key rule as Resend/Google/Calendly/Checkr: a stored
        // credential arrives MASKED (•••• + last 4) on the client and must
        // never count as verified. Only a real, unmasked SID authenticates
        // — which only ever happens server-side (decrypted at point of use).
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
            // Verify against the live Twilio API: GET /Accounts/{sid}.json.
            // A bad SID/token fails loudly with Twilio's real error.
            // The From number / template SID are config, not credentials —
            // they travel alongside but are not verified here (a sender
            // can only be proven by sending).
            const result = await verifyWhatsapp(credentials.accountSid, credentials.authToken);
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain a usable token:
            // keep only the MASKED form in registry state and don't store
            // the full token on the instance either. The caller persists it
            // via onSave right after; the encrypted server copy is the
            // only copy. Client-side integrations never execute.
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
        // No dispatch integrations exist: sending is a manual,
        // consent-gated recruiter action on the application page, not a
        // trigger. No automation rule or stage-move hook fires a
        // WhatsApp message. See the module header for why.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createWhatsappProvider = (installed: InstalledPlugin) =>
    new WhatsappProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER a usable key.
const mask_value = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked (`••••` + last 4). */
const mask_credentials = (
    credentials: Record<string, string>,
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] = typeof value === "string" ? mask_value(value) : value;
    }
    return out;
};
