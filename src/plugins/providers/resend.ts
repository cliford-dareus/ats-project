// Provider: Resend  ·  5 integrations, one per meaningful ATS trigger
//
// Integrations:
//   1. application-confirmation   candidate_applied       → confirm receipt to candidate
//   2. stage-transition-notify    stage_changed           → email candidate + hiring manager
//   3. interview-reminder         interview_scheduled     → reminder email to both parties
//   4. offer-letter               offer_extended          → formal offer email to candidate
//   5. resume-score-report        score_updated           → internal scorecard email to recruiter

// ─────────────────────────────────────────────────────────────────────────────
// Integration 1 — Application Confirmation
// Fires on: candidate_applied
// Sends:    confirmation email to candidate
// ─────────────────────────────────────────────────────────────────────────────
class ApplicationConfirmationIntegration implements ATSIntegration {
    readonly id = "resend-application-confirmation";
    readonly name = "Application Confirmation";
    readonly icon = "📨";
    readonly description = "Sends a branded confirmation email to the candidate immediately after they apply.";
    readonly latency = "realtime" as const;

    constructor(
        readonly providerId: string,
        private readonly apiKey: string,
        private readonly fromAddress: string,
        private readonly companyName: string,
    ) { }

    getSupportedTriggers(): SmartTrigger[] {
        return [{
            id: "resend-on-apply",
            name: "Confirm Application Receipt",
            description: "Email candidate when they submit an application.",
            on: ["candidate_applied"],
        }];
    }

    async execute(event: TriggerEvent, context: ATSContext): Promise<ATSIntegrationResult> {
        if (event.type !== "candidate_applied") return { success: false, error: "Unsupported event" };

        const candidate = context.candidate;
        const job = context.job;

        if (!candidate?.email) return { success: false, error: "No candidate email in context" };

        // const html = baseLayout(`
        //     <div class="header"><h1>${this.companyName}</h1></div>
        //     <div class="body">
        //         <p>Hi ${candidate.name.split(" ")[0]},</p>
        //         <p>Thank you for applying${job ? ` for the <strong>${job.title}</strong> position` : ""}. We've received your application and our team will review it shortly.</p>
        //         <div class="card">
        //         <div class="label">Application</div>
        //         <div class="value">${job?.title ?? "Open Position"}</div>
        //         ${job?.department ? `<div style="margin-top:8px"><div class="label">Department</div><div class="value">${job.department}</div></div>` : ""}
        //         <div style="margin-top:8px"><div class="label">Submitted</div><div class="value">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div></div>
        //         </div>
        //         <p>We review applications on a rolling basis and will be in touch within 5–7 business days.</p>
        //             <p>Best,<br/><strong>The ${this.companyName} Talent Team</strong></p>
        //         </div>
        //         <div class="footer"><p>© ${new Date().getFullYear()} ${this.companyName}. You're receiving this because you applied for a role.</p></div>
        //         `, "#111");

        const applicationSubmittedProps = {
            candidateName: candidate.name,
            jobTitle: job?.job_name,
            companyName: job?.job_subdomail,
            companyLogoUrl: "",
            applicationId: 1,         // Optional reference number
            expectedResponseTime: "",    // e.g. "within 7-10 business days"
            senderName: "",
            senderTitle: ""
        };
        
        console.log(`[Registry] Processing integration ${this.id} for provider ${this.providerId} with event ${event.type} and apiKey=${this.apiKey}`);

        const html = await render(React.createElement(ApplicationConfirmationTemplate), applicationSubmittedProps || {})

        const { id } = await sendEmail({
            apiKey: this.apiKey,
            from: `${this.companyName} Recruiting <${this.fromAddress}>`,
            to: candidate.email,
            subject: `We received your application${job ? ` for ${job.job_name}` : ""} ✓`,
            html,
            tags: [
                { name: "event", value: "candidate_applied" },
                { name: "org", value: context.organizationId },
                { name: "candidate", value: candidate.name! },
            ],
        });

        console.log(`[Registry] Sent email ${id} to ${candidate.email} with event ${event.type}`);
        return {
            success: true,
            data: { emailId: id, sentTo: candidate.email },
            metadata: { integration: this.id, candidateId: String(candidate.id) },
        };
    }
};

import ApplicationConfirmationTemplate from "@/emails/application_submitted_template";
// ─────────────────────────────────────────────────────────────────────────────
// ResendProvider — owns all 5 integrations
// ─────────────────────────────────────────────────────────────────────────────
import { ATSIntegration, ATSPluginProvider } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { sendEmail } from "@/lib/resend";
import { verifyResend } from "@/server/actions/stage_actions";
import { ATSContext, ATSIntegrationResult, InstalledPlugin, PluginAuthState, PluginCapability, SmartTrigger, TriggerEvent } from "@/types";
import { render } from "@react-email/components";
import React from "react";
import { Resend } from "resend";

export class ResendProvider implements ATSPluginProvider {
    readonly id = "resend";
    readonly name = "Resend";
    readonly description = "Transactional email for every stage of the hiring pipeline — confirmations, transitions, offers, and internal reports.";
    readonly capabilities: PluginCapability[] = ["communication"];
    readonly providerColor = "#000000";

    private authState: PluginAuthState;
    private apiKey: string;
    private fromAddress: string;
    private companyName: string;
    private hiringManagerEmail: string;
    private recruiterEmail: string;
    private offerSigningUrl: string | undefined;

    constructor(installed: InstalledPlugin) {
        this.apiKey = installed.settings.credentials?.apiKey ?? "";
        this.fromAddress = installed.settings.config?.fromAddress as string ?? "";
        this.companyName = installed.settings.config?.companyName as string ?? "Company";
        this.hiringManagerEmail = installed.settings.config?.hiringManagerEmail as string ?? "";
        this.recruiterEmail = installed.settings.config?.recruiterEmail as string ?? "";
        this.offerSigningUrl = installed.settings.config?.offerSigningUrl as string | undefined;

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
            // Validate: GET https://api.resend.com/domains  (returns 200 if key is valid)
            const result = await verifyResend(credentials.apiKey);
            if (!result.success) throw new Error(result.message);

            this.apiKey = credentials.apiKey;
            this.authState = { status: "authenticated", credentials };
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
        return [
            new ApplicationConfirmationIntegration(
                this.id, this.apiKey, this.fromAddress, this.companyName,
            ),
            // new StageTransitionNotifyIntegration(
            //     this.id, this.apiKey, this.fromAddress, this.companyName, this.hiringManagerEmail,
            // ),
            // new InterviewReminderIntegration(
            //     this.id, this.apiKey, this.fromAddress, this.companyName,
            // ),
            // new OfferLetterIntegration(
            //     this.id, this.apiKey, this.fromAddress, this.companyName, this.offerSigningUrl,
            // ),
            // new ScoreReportIntegration(
            //     this.id, this.apiKey, this.fromAddress, this.companyName, this.recruiterEmail,
            // ),
        ];
    }
};

// ── Factory ───────────────────────────────────────────────────────────────────
export const createResendProvider = (installed: InstalledPlugin) =>
    new ResendProvider(installed);
