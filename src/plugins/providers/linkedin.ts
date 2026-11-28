// Provider: LinkedIn  ·  0 live integrations — manual workflow only
//
// REALITY CHECK (read this before "improving" it):
// LinkedIn has no free public job-posting API. Posting a job to LinkedIn
// requires a Talent Solutions partnership and credentials Applico does not
// have, and there is no endpoint to call. So this provider deliberately
// does NOT:
//   • call any LinkedIn API (no endpoints are invented here),
//   • store any LinkedIn credential (there is no API key / secret that
//     would do anything — PLUGIN_CREDENTIAL_KEYS has no "linkedin" entry,
//     and none should be added until a real Talent Solutions integration
//     exists),
//   • claim any job was posted to LinkedIn.
//
// What it IS: a credentials-free, manual-workflow provider. It holds the
// org's public LinkedIn Page URL (plain config, not a secret — the Page
// URL is public) so the per-job posting draft can name the right Page,
// and it reports "configured" when a valid Page URL is saved. The actual
// posting happens by hand on the job detail page: Applico prepares the
// post text, a human publishes it on LinkedIn, and the real post URL is
// pasted back so the syndication state records 'posted' with a real URL.
// A job is never shown as posted to LinkedIn without that URL.
//
// "authenticated" here therefore means CONFIGURED (a valid Page URL is
// saved) — NOT "an API key was verified", because there is no API to
// verify against. The config UI says "Configured", never "Connected ·
// API verified".

import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { InstalledPlugin, PluginAuthState, PluginCapability } from "@/types";

/** LinkedIn's brand color, for the config UI wordmark. */
export const LINKEDIN_BRAND_COLOR = "#0A66C2";

/**
 * Validate a LinkedIn Page URL. Returns an error message, or null when
 * the URL is usable as the org's LinkedIn Page. Pure shape check — no
 * network call exists that could verify it (see the header).
 */
export const validateLinkedInPageUrl = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return "A LinkedIn Page URL is required";
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return "Enter a full URL, e.g. https://www.linkedin.com/company/acme";
    }
    if (url.protocol !== "https:") {
        return "The LinkedIn Page URL must start with https://";
    }
    if (url.hostname !== "linkedin.com" && !url.hostname.endsWith(".linkedin.com")) {
        return "The URL must be on linkedin.com";
    }
    // Company Pages live at /company/<slug> — a /in/<slug> personal
    // profile URL is not a Page and cannot be used for a company post.
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "company" || !segments[1]) {
        return "Enter your company's LinkedIn Page URL, e.g. https://www.linkedin.com/company/acme";
    }
    return null;
};

export class LinkedInProvider implements ATSPluginProvider {
    readonly id = "linkedin";
    readonly name = "LinkedIn";
    readonly description =
        "Prepare LinkedIn posts for open roles by hand — LinkedIn has no free job-posting API, so Applico never posts automatically.";
    readonly capabilities: PluginCapability[] = ["syndication"];
    readonly providerColor = LINKEDIN_BRAND_COLOR;

    private authState: PluginAuthState;
    private pageUrl: string;

    constructor(installed: InstalledPlugin) {
        const stored = installed.settings.config?.pageUrl;
        this.pageUrl = typeof stored === "string" ? stored.trim() : "";
        // A saved, well-formed Page URL is the whole of "configured".
        // No credential exists to verify, and a stored value is public
        // (not a masked secret), so there is no masked-vs-real trap here
        // like the API-key providers have.
        this.authState =
            this.pageUrl !== "" && validateLinkedInPageUrl(this.pageUrl) === null
                ? { status: "authenticated" }
                : { status: "unauthenticated" };
    }

    getAuthState(): PluginAuthState {
        return this.authState;
    }

    async authenticate(credentials: Record<string, string>): Promise<void> {
        this.authState = { status: "authenticating" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
        try {
            // Shape-only validation. There is NO live check to run:
            // LinkedIn's job-posting API requires a Talent Solutions
            // partnership, and no endpoint is called here. Any future
            // real integration must add its own server-side verify step
            // (like verifyGoogle / verifyResend) — do not fake one.
            const pageUrl = (credentials.pageUrl ?? "").trim();
            const problem = validateLinkedInPageUrl(pageUrl);
            if (problem) throw new Error(problem);

            // The caller persists the URL via onSave right after; the
            // provider keeps only the public Page URL in memory — no
            // secret is ever held here.
            this.pageUrl = pageUrl;
            this.authState = { status: "authenticated" };
            pluginRegistry.stateManager.setState(this.id, this.authState);
        } catch (e) {
            this.authState = { status: "error", error: (e as Error).message };
            pluginRegistry.stateManager.setState(this.id, this.authState);
            throw e;
        }
    }

    async deauthenticate(): Promise<void> {
        this.pageUrl = "";
        this.authState = { status: "unauthenticated" };
        pluginRegistry.stateManager.setState(this.id, this.authState);
    }

    getIntegrations(): ATSIntegration[] {
        // No dispatch integrations exist: nothing posts to LinkedIn
        // automatically, so there is nothing for the trigger engine to
        // run. Posting is a manual per-job workflow (see the header).
        return [];
    }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export const createLinkedInProvider = (installed: InstalledPlugin) =>
    new LinkedInProvider(installed);
