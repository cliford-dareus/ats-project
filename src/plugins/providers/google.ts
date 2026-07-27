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

        const res = await score_resume(fileUrl, context.job?.job_name ?? "", context.job?.job_description ?? "", this.apiKey);
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
import { score_resume } from "@/server/actions/resume-actions";
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
        this.apiKey = installed.settings.credentials?.apiKey ?? "";
        this.orgId = installed.settings.credentials?.orgId ?? "";
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
            // Validate key: fetch https://api.openai.com/v1/models
            this.apiKey = credentials.apiKey;
            this.authState = { status: "authenticated", credentials };
            pluginRegistry.stateManager.setState(this.id, this.authState);
        } catch (e) {
            this.authState = { status: "error", error: String(e) };
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
