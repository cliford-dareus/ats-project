import { CANDIDATE_STATUS, JOB_ENUM, JOB_STAGES, JOB_STATUS, JOB_TYPE } from "@/zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared API response types
// ─────────────────────────────────────────────────────────────────────────────
export type JobResponseType = {
    id: number;
    name: string;
    location: string;
    description: string;
    salary: string;
    salary_from: string | null;
    createdBy: string;
    created_at: Date;
    type: typeof JOB_TYPE._type;
    updated_at: Date;
    organization: string;
    department: string;
    status: typeof JOB_STATUS._type;
    application_count: number;
};

export type CandidatesResponseType = {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    location: string;
    status: typeof CANDIDATE_STATUS._type | null;
    created_at: Date;
    updated_at: Date;
    applicationsCount: number;
    attachmentsCount: number;
    attachments: { id: number; file_name: string; file_url: string; attachment_type: "RESUME" | "COVER_LETTER" | "OFFER_LETTER" | "OTHER" | null }[];
};

export type ApplicationResponseType = {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string;
    candidate_portfolio: string | null;
    candidate_linkedin: string | null;
    can_contact: boolean;
    cover_letter: string | null;
    referral_source: string | null;
    expected_salary: string | null;
    earliest_start_date: string | null;
    status: JOB_ENUM;
    job_apply: string;
    job_id: number;
    type: string;
    location: string;
    department: string;
    current_stage: JOB_ENUM;
    assign_to: string;
    interview: InterviewType;
    apply_date: Date;
    updated_at: Date;
};

export type StageResponseType = {
    id: number;
    job_id: number;
    stage_name: typeof JOB_STAGES._type | null
    stage_order_id: number
    assign_to: string | null
    color: string | null;
    need_schedule: boolean | null;
};

export type NoteResponseType = {
    notes: NoteType[];
    total: number;
};

export type OpenJobResponseType = {
    id: number,
    name: string,
    location: string,
    description: string,
    salary_up_to: string,
    salary_from: string | null,
    type: typeof JOB_TYPE._type | null,
    subdomain: string,
    organization: string,
    status: typeof JOB_STATUS._type | null,
    created_by: string,
    created_at: Date,
    updated_at: Date,
    department: string | null,
};

export type CandidateDetailsType = {
    candidate_id: number;
    resumeSummary: string;
    skills: string[];
    experience: CandidateExperience[];
    education: CandidateEducation[];
    key_accomplishments: string[];
    references: CandidateReference[];
};

// ── Claude interview prep (anthropic-screening plugin, migration 0016) ──────
// One row per generation; the application page renders the latest. The
// shape is validated by zod at generation time
// (src/server/ai/anthropic-screening.ts) — a malformed Claude reply is a
// failed generation, never stored.
export type InterviewPrepQuestion = {
    category: string;
    question: string;
    rationale: string;
};

export type InterviewPrepInsights = {
    summary: string;
    strengths: string[];
    risks: string[];
    focusAreas: string[];
};

export type InterviewPrepDTO = {
    id: number;
    application_id: number;
    // Snapshot of the application's stage when generated — the card warns
    // when the candidate has since moved stage.
    stage_name: string | null;
    // Model id actually called for this generation.
    model: string;
    questions: InterviewPrepQuestion[];
    insights: InterviewPrepInsights;
    generated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface ThreadItem {
    _id: string;
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_avatar: string;
    candidate_role: string;
    candidate_status: typeof CANDIDATE_STATUS._type;
    last_message: string;
    last_timestamp: string;
    unread_count: number;
    starred: boolean;
    messages: MessageItem[];
}

export interface MessageItem {
    _id: string;
    authorName: string;
    authorAvatar?: string;
    text: string;
    timestamp: string;
    sender: 'candidate' | 'recruiter' | 'team' | 'system';
    channel: 'Email' | 'SMS' | 'Internal Note';
    read?: boolean;
    createdAt: string;
}

export type EmailTemplateDTO = {
    _id: string;
    templateId: string;
    name: string;
    subject: string;
    body: string;
    isDefault?: boolean;
    isSystem?: boolean;
    organizationId: string;
    createdAt?: string;
    updatedAt?: string;
};

export type InterviewType = {
    id: number,
    // The interviews table names this column applications_id (nullable FK);
    // the DTO keeps the application_id name — map at the query boundary.
    application_id: number | null,
    start_at: Date | null,
    end_at: Date | null,
    locations: string;
    type: "VIDEO" | "PHONE" | "ONSITE" | null;
    status: "SCHEDULE" | "COMPLETE" | "AWAITING_FEEDBACK" | "HOLD_PENDING" | "CANCELLED" | null;
    link?: string | null;
    // Scheduling provider (migration 0015): 'google' is the default for
    // every pre-Calendly row. Calendly rows carry their own identifiers
    // below; calendar_event_id is Google-typed and never overloaded.
    scheduling_provider?: "google" | "calendly" | null;
    calendly_event_type_uri?: string | null;
    calendly_event_type_name?: string | null;
    calendly_event_uri?: string | null;
    calendly_invitee_uri?: string | null;
    // Smart interview holds (nullable when the interview was scheduled directly)
    hold_status?: "NONE" | "TENTATIVE" | "CONFIRMED" | "DECLINED" | "EXPIRED" | "RELEASED" | null;
    hold_expires_at?: Date | string | null;
};

export interface ApplicationType {
    id: number;
    created_at: Date;
    updated_at: Date;
    job_id: number;
    organization: string;
    stage: typeof JOB_STAGES._type | null | undefined;
    current_stage_id?: number | null;
    stage_order_id?: number | null;
    position_in_stage?: number;

    // Resume Scoring
    resume_score: number | null;
    resume_score_fit: number | null;
    resume_score_skills: number | null;
    resume_score_exp: number | null;
    resume_score_summary: string | null;
    resume_scored_at: Date | null;
    resume_score_model: string | null;

    candidate: CandidateType;
    interviews: InterviewType | null;
    // Matches the attachments table row (attachment_type, not file_type).
    attachments: { id: number; file_name: string; file_url: string; candidate_id: number; attachment_type: "RESUME" | "COVER_LETTER" | "OFFER_LETTER" | "OTHER" | null }[]
};

export type JobListingWithCandidatesType = {
    job_id: number
    job_name: string
    job_location: string
    job_status: 'OPEN' | 'CLOSED' | 'DRAFT' | 'ARCHIVED' | 'PENDING'
    job_created_at: Date
    job_updated_at: Date
    job_createdBy: string
    application_id: number | null
    application_updated_at: Date
    stageName: JOB_ENUM
    stage_order_id: number | null
    candidate_name: string | null
    candidate_id: number | null
};

export interface CandidateExperience {
    company: string;
    position: string;
    period?: string;
    start_date: string;
    end_date?: string;
    current: boolean;
    description: string;
    total_experience?: number;
};

export interface CandidateEducation {
    school: string;
    degree: string;
    field_of_study: string;
    graduation_date: string;
};

export interface CandidateReference {
    name?: string;
    email?: string;
    company?: string;
    relationship?: string;
    phone?: string;
};

export interface CandidateType {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    role?: string;
    location?: string;
    status: typeof CANDIDATE_STATUS._type | null;
    created_at: Date;
    updated_at: Date;
    interview?: InterviewType[];
    skills?: string[];
    experience?: CandidateExperience[];
    education?: string[];
};

export interface Application {
    application_id: number;
    job_id: number;
    updated_at: Date;
    stageName?: JOB_ENUM | null | undefined;
    stage_order_id?: number;
    candidate: CandidateType;
};

export interface JobExperienceType {
    id: number;
    name: string;
    years_experience: number | null;
};

export interface JobListingType {
    job_id: number;
    job_name: string;
    job_created_at: Date;
    job_description: string;
    job_department: string;
    job_status: typeof JOB_STATUS._type | null;
    job_type: typeof JOB_TYPE._type | null;
    job_subdomain: string;
    job_location: string;
    job_technologies: JobExperienceType[];
    applications: ApplicationType[];
    job_updated_at: Date;
};

export interface CandidateWithDetails {
    candidate: CandidateType;
    application: ApplicationType[] | null;
    stage: StageResponseType[] | null;
    job_listing: JobListingType[] | null;
    interview: InterviewType[] | null;
    scoreCard: string[] | null;
};

export type GeneralSettingsUpdate = {
    name: string;
    locations: string;
    phone: string;
    email: string;
    primary_color: string;
    font_family: string;
    subdomain: string;
    tagline: string | null;
    logo_url: string | null;
};

export interface FormErrors {
    [key: string]: string | undefined;
};

export type UserType = {
    name: string;
    image: string;
    email: string;
    age: number;
};

export type NoteType = {
    _id: string;
    text: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    note_id: string;
    note_type: string;
    created_at: Date;
    updated_at: Date;
    author: string;
    created_by?: string;
    organization_id?: string;
    mentions?: { userId: string; name: string; username?: string }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the ATS plugin system
// ─────────────────────────────────────────────────────────────────────────────

// ── Trigger Events ────────────────────────────────────────────────────────────
// candidateId is ALWAYS the candidates.id. applicationId (when known) is the
// applications.id — the two must never be conflated: add_note targets the
// candidate, move_stage targets the application. Call sites that only know
// the application must send applicationId and let the server resolve the
// candidate; call sites that only know the candidate may omit it.
export type TriggerEvent =
    | { type: "candidate_applied"; candidateId: string; jobId: string; applicationId?: number }
    | { type: "stage_changed"; candidateId: string; fromStage: string; toStage: string; applicationId?: number }
    | { type: "interview_scheduled"; candidateId: string; interviewerId: string; at: Date; applicationId?: number }
    | { type: "offer_extended"; candidateId: string; amount: number; applicationId?: number }
    | { type: "resume_uploaded"; candidateId: string; fileUrl: string; applicationId?: number }
    | { type: "score_updated"; candidateId: string; score: number; dimension: string; applicationId?: number };

export type TriggerEventType = TriggerEvent["type"];

// ── Plugin Metadata ───────────────────────────────────────────────────────────
export type PluginCapability =
    | "llm_scoring"
    | "background_check"
    | "calendar_integration"
    | "communication"
    | "analytics"
    | "sourcing"
    | "syndication"
    | "compliance";

// ── Job-board syndication ───────────────────────────────────────────────────
// One row of `job_syndication` per (job, board), as the dashboard reads it.
// `boardId` is the board this row is about; `enabled` is whether the org
// has that board's plugin installed + enabled (a disabled board can never
// be published from the UI, whatever its stored row says).
export type SyndicationBoardId = "indeed" | "linkedin";

export type SyndicationBoardStatus = "not_syndicated" | "syndicated" | "failed" | "posted";

export interface SyndicationBoardState {
    boardId: SyndicationBoardId;
    enabled: boolean;
    status: SyndicationBoardStatus;
    externalUrl: string | null;
    errorMessage: string | null;
    updatedAt: string | null;
}

// ── Checkr background check state (one row per application) ─────────────
// Statuses are Checkr's verbatim values — invitation: pending /
// completed / expired (+ Applico-local 'canceled'); report: pending /
// complete / suspended / dispute / canceled; result: clear / consider
// (null while pending). `environment` is the Checkr environment the
// check actually ran in ('test' = staging, no real checks; 'live' =
// production, billable) and is always surfaced in the UI.
export type CheckrEnvironment = "test" | "live";

export interface CheckrCheckState {
    applicationId: number;
    environment: CheckrEnvironment;
    packageSlug: string;
    checkrCandidateId: string | null;
    checkrInvitationId: string | null;
    checkrReportId: string | null;
    invitationStatus: "pending" | "completed" | "expired" | "canceled" | null;
    reportStatus: "pending" | "complete" | "suspended" | "dispute" | "canceled" | null;
    reportResult: "clear" | "consider" | null;
    adjudication: "engaged" | "pre_adverse_action" | "post_adverse_action" | null;
    invitationUrl: string | null;
    invitationExpiresAt: string | null;
    reportCompletedAt: string | null;
    consentConfirmedBy: string | null;
    consentConfirmedAt: string | null;
    errorMessage: string | null;
    updatedAt: string | null;
}

export interface PluginAuthState {
    status: "unauthenticated" | "authenticating" | "authenticated" | "error";
    error?: string;
    credentials?: Record<string, string>;
};

// ── Plugin DB record (what's stored in your DB per org) ──────────────────────
export interface OrgPluginRecord {
    enabled: string[];
    settings: Record<string, OrgPluginSettings>;
};

export interface OrgPluginSettings {
    active: boolean;
    credentials?: Record<string, string>;
    config?: Record<string, unknown>;
    enabledIntegrations?: Record<string, boolean>;
    /**
     * B4: set when the stored credentials could not be decrypted (wrong
     * key / tampered value). The plugin is skipped by the blob read and
     * treated as not-installed — it must never dispatch with a missing
     * key. Never contains a key value.
     */
    credentialsError?: boolean;
};

// ── Installed plugin (hydrated from DB + AVAILABLE_PLUGINS manifest) ─────────
export interface InstalledPlugin {
    id: string;
    name: string;
    description: string;
    capabilities: PluginCapability[];
    logoUrl?: string;
    providerColor?: string;
    settings: OrgPluginSettings;
};

// ── Org plugin state returned by server action ────────────────────────────────
export interface OrgPluginState {
    flags: Record<string, boolean>;
    installed: InstalledPlugin[];
};

// ── ATS Context passed to every integration execute() call ───────────────────
export interface ATSContext {
    organization_id: string;
    user_id: string;
    candidate?: Partial<CandidateType>;
    job?: Partial<JobListingType>;
    settings: Record<string, unknown>;
};

// ── Smart Trigger definition ─────────────────────────────────────────────────
export interface SmartTrigger {
    id: string;
    name: string;
    description: string;
    on: TriggerEventType[];
    condition?: (event: TriggerEvent, context: ATSContext) => boolean | Promise<boolean>;
};

// ── Integration result ────────────────────────────────────────────────────────
export interface ATSIntegrationResult {
    success: boolean; data?: unknown;
    error?: string;
    metadata?: Record<string, string>;
};

// ── A trigger that fired — returned by the plugin registry dispatch so the
// UI can render toasts + an activity log ───────────────────────────────────────
export interface FiredTrigger {
    integrationId: string;
    integrationName: string;
    icon: string;
    provider: string;
    providerColor: string;
    candidateName: string;
    result: ATSIntegrationResult;
    at: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED AUTOMATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

// ── Trigger condition — what starts the automation ────────────────────────────
export type AutomationTriggerOn =
    | { event: "stage_changed"; toStage: typeof JOB_STAGES._type; fromStage?: typeof JOB_STAGES._type }   // moved TO this stage
    | { event: "candidate_applied" }
    | { event: "resume_uploaded" }
    | { event: "offer_extended" }
    | { event: "interview_scheduled" };

// ── Delay — when to run the action after the trigger ─────────────────────────
export interface AutomationDelay {
    value: number;
    unit: "seconds" | "minutes" | "hours" | "days";
};

export function delayToMs(d: AutomationDelay): number {
    const factors: Record<AutomationDelay["unit"], number> = {
        seconds: 1_000,
        minutes: 60_000,
        hours: 3_600_000,
        days: 86_400_000,
    };
    // B5: a garbage unit (or non-finite / negative value) used to yield
    // NaN, which setTimeout treats inconsistently across runtimes. Fail
    // closed to 0 (run immediately) instead of NaN.
    if (!d || !Number.isFinite(d.value) || d.value < 0) return 0;
    const factor = factors[d.unit];
    if (!Number.isFinite(factor)) return 0;
    return d.value * factor;
};

export function delayLabel(d: AutomationDelay): string {
    return d.value === 0 ? "immediately" : `after ${d.value} ${d.unit === "minutes" && d.value === 1 ? "minute" : d.unit}`;
};

// ── Action — what to do ───────────────────────────────────────────────────────
export type AutomationAction =
    | {
        type: "add_note";
        content: string;          // the note text (can include {{candidate.name}} etc.)
        pinned?: boolean;
    }
    | {
        type: "send_sms";
        to: "candidate" | "recruiter" | "hiring_manager";
        message: string;          // SMS body, supports {{tokens}}
    }
    | {
        type: "send_email";
        to: "candidate" | "recruiter" | "hiring_manager";
        subject: string;
        body: string;
        integrationId?: string;   // optional: use a Resend template integration
    }
    | {
        type: "fire_integration";
        providerId: string;
        integrationId: string;
    }
    | {
        type: "move_stage";
        toStage: string;
    }
    | {
        type: "assign_recruiter";
        userId: string;
    };

export type AutomationActionType = AutomationAction["type"];

// ── Full automation rule — one rule = one trigger + one action + optional delay
export interface AutomationRule {
    id: string;
    job_id: number;
    name: string;
    enabled: boolean;
    trigger: AutomationTriggerOn;
    delay: AutomationDelay;
    action: AutomationAction;
    created_at: string;          // ISO date string
    updated_at: string;
};

// ── Pending delayed execution (stored in memory / Redis / DB) ─────────────────=
export interface PendingExecution {
    id: string;
    ruleId: string;
    ruleName: string;
    applicationId: number;        // applications.id the execution targets
    scheduledAt: number;          // Date.now() + delayMs
    event: Record<string, unknown>;
    context: Record<string, unknown>;
};

// ── UI metadata for the rule builder ─────────────────────────────────────────
export const ACTION_LABELS: Record<AutomationActionType, { label: string; icon: string; description: string }> = {
    add_note: { label: "Add note", icon: "📝", description: "Append a note to the candidate's profile" },
    send_sms: { label: "Send SMS", icon: "💬", description: "Send a text message to candidate or team" },
    send_email: { label: "Send email", icon: "📧", description: "Send a custom email" },
    fire_integration: { label: "Run integration", icon: "⚡", description: "Trigger a connected plugin integration" },
    move_stage: { label: "Move stage", icon: "➡️", description: "Automatically advance or move the candidate" },
    assign_recruiter: { label: "Assign recruiter", icon: "👤", description: "Assign a team member to this candidate" },
};

export const DELAY_PRESETS: AutomationDelay[] = [
    { value: 0, unit: "minutes" },
    { value: 1, unit: "minutes" },
    { value: 5, unit: "minutes" },
    { value: 15, unit: "minutes" },
    { value: 30, unit: "minutes" },
    { value: 1, unit: "hours" },
    { value: 2, unit: "hours" },
    { value: 24, unit: "hours" },
    { value: 1, unit: "days" },
    { value: 3, unit: "days" },
];

// ── Token interpolation ───────────────────────────────────────────────────────
// Used in note content, SMS messages, email subjects/bodies.
export const interpolate = (template: string, vars: Record<string, string>): string => {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
};
