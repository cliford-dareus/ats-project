// Provider: DocuSign  ·  0 dispatch integrations — manual initiation only.
//
// REALITY CHECK (read this before "improving" it):
// DocuSign sends offer letters through template-based envelopes:
// create an envelope from a template (templateId + templateRoles), the
// candidate signs via DocuSign's email link, status comes back on
// demand. What this provider deliberately does NOT do:
//   • No automatic sending on stage change — the manifest says "when a
//     candidate reaches the Offer stage", but sending is a deliberate
//     recruiter action from the application page, gated on the Offer
//     stage + an explicit "offer is final" confirmation. No automation
//     rule or stage-move hook fires it silently.
//   • No offer-letter generation — Applico has no offer-letter PDF
//     builder. The document + signature tabs live in a DocuSign
//     template the org creates in the DocuSign dashboard; Applico only
//     binds the candidate to the template's signer role. An org that
//     has no template cannot send.
//   • No live polling and no Connect webhook receiver — envelope status
//     is refreshed on demand from the application card. DocuSign
//     recommends Connect webhooks (envelope-completed etc.) over
//     polling; registering one is a follow-up (outbound webhooks are
//     out of scope for this build).
//   • No embedded signing in Applico — the candidate signs through
//     DocuSign's emailed link. No recipient-view URL is generated or
//     stored.
//
// Auth is the JWT grant (see src/server/docusign.ts): integration key +
// RSA private key + impersonated user id, one-time consent in DocuSign.
// The Authorization Code grant was rejected for this codebase: it needs
// a human at a browser + a redirect/callback round trip per
// authorization, and there is no OAuth redirect infrastructure for
// plugins. The private key is stored encrypted (AES-256-GCM) via the
// existing plugin-key path and is never logged, returned, or exposed.
//
// "authenticated" here means: credentials were verified against
// GET /oauth/userinfo THIS session (mirrors the Resend/Google/Calendly
// masked-key rule — a stored masked `••••` value never counts as
// verified). The provider holds no usable key client-side; the
// encrypted server copy is the only copy.
//
// Environment honesty: the environment selects the OAuth host only —
// demo = account-d.docusign.com (test signatures, no legal weight),
// production = account.docusign.com (real, legally-binding signatures).
// The REST base URI is discovered per account from userinfo, never
// guessed. The configured environment is surfaced on every surface
// that sends or shows an envelope; nothing ever silently uses
// production.

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyDocuSign } from "@/server/actions/docusign-actions";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";
import type { DocuSignEnvironment } from "@/types";

/** DocuSign's brand color, for the config UI wordmark. */
export const DOCUSIGN_BRAND_COLOR = "#003a5d";

export class DocuSignProvider implements ATSPluginProvider {
    readonly id = "docusign";
    readonly name = "DocuSign Offer Letters";
    readonly description =
        "Send offer letters for e-signature via DocuSign when a candidate reaches the Offer stage.";
    readonly capabilities: PluginCapability[] = ["e_signature"];
    readonly providerColor = DOCUSIGN_BRAND_COLOR;

    private authState: PluginAuthState;
    private credentials: Record<string, string>;

    constructor(installed: InstalledPlugin) {
        const stored = installed.settings.credentials ?? {};
        const integrationKey = stored.integrationKey ?? "";
        // Same masked-key rule as Resend/Google/Calendly/Checkr: a stored
        // credential arrives MASKED (•••• + last 4) on the client and must
        // never count as verified. Only real, unmasked credentials
        // authenticate — which only ever happens server-side (decrypted
        // at point of use). The private key is masked generically (see
        // mask_credentials below): a PEM's last 4 characters are
        // meaningless and must never be displayed.
        this.credentials = integrationKey.startsWith("••••") ? {} : stored;
        this.authState = Object.keys(this.credentials).length > 0
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
            // JWT token exchange + GET /oauth/userinfo. A bad key, bad
            // user id, bad private key, or missing consent fails loudly
            // with DocuSign's real error. The environment comes from the
            // config the caller passes alongside the credentials.
            const environment = (
                credentials.environment === "production" ? "production" : "demo"
            ) as DocuSignEnvironment;
            const result = await verifyDocuSign(
                credentials.integrationKey,
                credentials.userId,
                credentials.privateKey,
                environment,
            );
            if (!result.success) throw new Error(result.message);

            // Verified — but the browser must not retain usable
            // credentials: keep only the MASKED form in registry state
            // and don't store the full values on the instance either.
            // The caller persists them via onSave right after; the
            // encrypted server copy is the only copy. Client-side
            // integrations never execute.
            this.credentials = {};
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
        this.credentials = {};
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        // No dispatch integrations exist: sending is a manual,
        // confirmation-gated recruiter action on the application page,
        // not a trigger. No automation trigger sends an offer letter.
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createDocuSignProvider = (installed: InstalledPlugin) =>
    new DocuSignProvider(installed);

// ── Mask helpers (client-safe) ────────────────────────────────────────────────
// src/lib/plugin-encryption.ts is server-only (node:crypto), so the masked
// check/mask is duplicated here: a masked display value (`••••` + last 4,
// or the generic `••••••••` when decryption failed) is NEVER a usable key.
// The RSA private key is ALWAYS masked generically — the last 4
// characters of a PEM ("-----") carry no identity and must not be shown.
const mask_api_key = (value: string): string =>
    !value || value.length <= 4 ? "••••••••" : `••••${value.slice(-4)}`;

/** Copy of a credentials map with every value masked. */
const mask_credentials = (
    credentials: Record<string, string>
): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(credentials)) {
        out[name] =
            name === "privateKey"
                ? "••••••••"
                : typeof value === "string"
                  ? mask_api_key(value)
                  : value;
    }
    return out;
};
