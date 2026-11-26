// Provider: Google  ·  5 integrations, one per meaningful ATS trigger
//
// Integrations:
//   1. resume-score               candidate_applied, resume_uploaded       → Automatically score resume
//   2. stage-transition-notify    stage_changed                            → email candidate + hiring manager
//   3. interview-reminder         interview_scheduled                      → reminder email to both parties
//   4. offer-letter               offer_extended                           → formal offer email to candidate
//   5. resume-score-report        score_updated                            → internal scorecard email to recruiter

// ─────────────────────────────────────────────────────────────────────────────
// Integration 1 — Resume Score
// Fires on: candidate_applied, resume_uploaded
// Sends:    Automatically score resume
// ─────────────────────────────────────────────────────────────────────────────
class ResumeScoreIntegration implements ATSIntegration {
    readonly id = "resume-score";
    readonly name = "Auto-Score Resume";
    readonly icon = "⚡";
    readonly description = "Scores a resume 0–100 on fit, skills, and experience.";
    readonly latency = "async" as const;

    constructor(
        readonly providerId: string,
        private readonly apiKey: string,
        private readonly orgId: string
    ) { }

    getSupportedTriggers(): SmartTrigger[] {
        return [
            {
                id: "on-apply-or-upload",
                name: "Score on Apply / Resume Upload",
                description: "Automatically score resume when a candidate applies or uploads a resume.",
                on: ["candidate_applied", "resume_uploaded"],
            },
        ];
    }

    async execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult> {
        if (event.type !== "candidate_applied" && event.type !== "resume_uploaded") {
            return { success: false, error: "Unsupported event" };
        }

        // Get the file URL — from the event or context
        const fileUrl =
            event.type === "resume_uploaded"
                ? event.fileUrl
                : (context.candidate as any)?.cv_path;

        if (!fileUrl) {
            return { success: false, error: "No resume file URL found" };
        }

        // Server-only lib (R2 + Gemini with server credentials) — dynamically
        // imported so the client-side plugin registry never bundles it. This
        // runs in the BullMQ worker, where there is no user session; the
        // plugin authenticates with its own API key from its installed
        // settings, so no session auth applies here.
        const { score_resume } = await import("@/server/resume-processing");

        const res = await score_resume(
            fileUrl,
            context.job?.job_name ?? "",
            context.job?.job_description ?? "",
            this.apiKey,
        );

        if (!res.success) {
            return { success: false, error: res.error };
        }

        const { score, breakdown, summary } = res.data;
        if (!score || !breakdown) {
            return { success: false, error: "Failed to score resume" };
        }

        return {
            success: true,
            data: { score, breakdown, summary },
            metadata: { model: "Gemini-2.0", orgId: this.orgId },
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration 2 — Resume Score
// Fires on: candidate_applied, resume_uploaded
// Sends:    Automatically score resume
// ─────────────────────────────────────────────────────────────────────────────


// ── Provider ──────────────────────────────────────────────────────────────────
import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyGoogle } from "@/server/actions/plugin-actions";
import { ATSContext, ATSIntegrationResult, InstalledPlugin, PluginAuthState, PluginCapability, SmartTrigger, TriggerEvent } from "@/types";

export class GoogleProvider implements ATSPluginProvider {
    readonly id = "google";
    readonly name = "Google";
    readonly description = "Uses Google suites to shedule interviews and use Gemini to score resumes and rank candidates.";
    readonly capabilities: PluginCapability[] = ["calendar_integration", "llm_scoring"];
    readonly providerColor = "#4285F4";

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
        // session — including after a rotation broke decryption (generic
        // mask, still truthy). Only a real, unmasked key authenticates,
        // which only ever happens server-side (decrypted at point of
        // use); dispatch() skips providers unless status is
        // "authenticated", so server dispatch is unaffected.
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
            // Validate: GET https://generativelanguage.googleapis.com/v1beta/models
            // (returns 200 if the Gemini key is valid). Previously this
            // accepted ANY non-empty key without checking it — the stale
            // comment even pointed at the OpenAI models endpoint.
            const result = await verifyGoogle(credentials.apiKey);
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
        return [new ResumeScoreIntegration(this.id, this.apiKey, this.orgId)];
    }
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createGoogleProvider = (installed: InstalledPlugin) =>
    new GoogleProvider(installed);

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
