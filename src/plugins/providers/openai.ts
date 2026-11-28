// Provider: OpenAI  ·  1 live integration
//
// Integrations:
//   1. resume-score-openai       candidate_applied, resume_uploaded       → Automatically score resume (GPT-4o)
//
// The integration id is deliberately NOT "resume-score": Google already
// owns that id, and integration ids are the key for enabledIntegrations
// toggles, the worker's score-save step, and FIRE_INTEGRATION_TARGETS in
// src/zod.ts — sharing one id would let one toggle control both scorers
// and leave the worker saving whichever result happened to finish first.
// The applications row holds a single score, labelled by
// resume_score_model ("gpt-4o" here), so the two scorers never confuse
// each other. When both scorers are installed the worker prefers the
// Google result (pre-existing behaviour) and uses this one only when
// Google didn't fire — see src/worker/index.ts step 4.

// ─────────────────────────────────────────────────────────────────────────────
// Integration 1 — Resume Score (GPT-4o)
// Fires on: candidate_applied, resume_uploaded
// Sends:    Automatically score resume
// ─────────────────────────────────────────────────────────────────────────────
class OpenAIResumeScoreIntegration implements ATSIntegration {
    readonly id = "resume-score-openai";
    readonly name = "Auto-Score Resume (GPT-4o)";
    readonly icon = "⚡";
    readonly description = "Scores a resume 0–100 on fit, skills, and experience with GPT-4o.";
    readonly latency = "async" as const;

    constructor(
        readonly providerId: string,
        private readonly apiKey: string,
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
                : context.candidate?.cv_path;

        if (!fileUrl) {
            return { success: false, error: "No resume file URL found" };
        }

        // Server-only lib (R2 + OpenAI with server credentials) — dynamically
        // imported so the client-side plugin registry never bundles it. This
        // runs in the BullMQ worker, where there is no user session; the
        // plugin authenticates with its own API key from its installed
        // settings, so no session auth applies here.
        const { score_resume_with_openai, OPENAI_RESUME_MODEL } = await import("@/server/openai-resume");

        const res = await score_resume_with_openai(
            fileUrl,
            context.job?.job_name ?? "",
            context.job?.job_description ?? "",
            this.apiKey,
        );

        if (!res.success) {
            return { success: false, error: res.error };
        }

        const { score, breakdown, summary } = res.data;
        // A legitimate score of 0 must not be treated as a failure.
        if (score == null || !breakdown) {
            return { success: false, error: "Failed to score resume" };
        }

        return {
            success: true,
            data: { score, breakdown, summary },
            // Model actually used by score_resume_with_openai — the value
            // saved as resume_score_model, so a GPT-4o score is never
            // confused with a Gemini one.
            metadata: { model: OPENAI_RESUME_MODEL },
        };
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────
import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyOpenAI } from "@/server/actions/plugin-actions";
import { ATSContext, ATSIntegrationResult, InstalledPlugin, PluginAuthState, PluginCapability, SmartTrigger, TriggerEvent } from "@/types";

export class OpenAIProvider implements ATSPluginProvider {
    readonly id = "openai-scoring";
    readonly name = "OpenAI";
    readonly description = "Uses GPT-4o to score resumes 0–100 on fit, skills, and experience.";
    readonly capabilities: PluginCapability[] = ["llm_scoring", "analytics"];
    readonly providerColor = "#10a37f";

    private authState: PluginAuthState;
    private apiKey: string;

    constructor(installed: InstalledPlugin) {
        const storedKey = installed.settings.credentials?.apiKey ?? "";
        // A stored key arrives MASKED (•••• + last 4) on the client and
        // must never count as verified: a masked value is truthy, so an
        // `apiKey ? authenticated` check would show "Connected · API
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
            // Validate: GET https://api.openai.com/v1/models (returns 200
            // for a valid key, 401 for an invalid one).
            const result = await verifyOpenAI(credentials.apiKey);
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
        return [new OpenAIResumeScoreIntegration(this.id, this.apiKey)];
    }
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createOpenAIProvider = (installed: InstalledPlugin) =>
    new OpenAIProvider(installed);

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
