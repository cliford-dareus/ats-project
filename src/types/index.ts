import { ConfigType } from "@/plugins/smart-trigger/types";
import { CANDIDATE_STATUS, JOB_ENUM, JOB_STAGES, JOB_STATUS, JOB_TYPE } from "@/zod";

// RESPONSE TYPES
export type JobResponseType = {
    id: number;
    name: string;
    location: string;
    description: string;
    salary: string;
    createdBy: string;
    created_at: Date;
    type: typeof JOB_TYPE._type;
    updated_at: Date;
    organization: string;
    department: string;
    status: typeof JOB_STATUS._type;
    candidatesCount: number;
};

export type CandidatesResponseType = {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    status: typeof CANDIDATE_STATUS._type | null;
    created_at: Date;
    updated_at: Date;
    applicationsCount: number;
    attachmentsCount: number;
};

export type ApplicationResponseType = {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string;
    can_contact: boolean;
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
    trigger: string;
};

export type TriggerResponseType = {
    id: number;
    action_type: string;
    stage_id: number;
    config: ConfigType;
    created_at: Date;
    updated_at: Date;
};

export type NoteResponseType = {
    notes: NoteType[];
    total: number;
};

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export type InterviewType = {
    id: number,
    application_id: number,
    candidate_id: number,
    interview_date: Date,
    interview_location: string,
    locations: string;
    type: "Video" | "Phone" | "Onsite";
    link: string;
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
    candidate: CandidateType;
    interviews: InterviewType[];
    attachments: any[]
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
    period: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    totalExperience: number;
}

export interface CandidateEducation {
    school: string;
    degree: string;
    field_of_study: string;
    graduation_date: string;
}

export interface CandidateReference {
    name: string;
    email: string;
    company: string;
    relationship: string;
    phone: string;
}

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
};


// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the ATS plugin system
// ─────────────────────────────────────────────────────────────────────────────

// ── Trigger Events ────────────────────────────────────────────────────────────
export type TriggerEvent =
    | { type: "candidate_applied"; candidateId: string; jobId: string }
    | { type: "stage_changed"; candidateId: string; fromStage: string; toStage: string }
    | { type: "interview_scheduled"; candidateId: string; interviewerId: string; at: Date }
    | { type: "offer_extended"; candidateId: string; amount: number }
    | { type: "resume_uploaded"; candidateId: string; fileUrl: string }
    | { type: "score_updated"; candidateId: string; score: number; dimension: string };

export type TriggerEventType = TriggerEvent["type"];

// ── Plugin Metadata ───────────────────────────────────────────────────────────
export type PluginCapability =
    | "llm_scoring"
    | "background_check"
    | "calendar_integration"
    | "communication"
    | "analytics"
    | "sourcing"
    | "compliance";

export interface PluginAuthState {
    status: "unauthenticated" | "authenticating" | "authenticated" | "error";
    error?: string;
    credentials?: Record<string, string>;
}

// ── Plugin DB record (what's stored in your DB per org) ──────────────────────
export interface OrgPluginRecord {
    enabled: string[];
    settings: Record<string, OrgPluginSettings>;
}

export interface OrgPluginSettings {
    active: boolean;
    credentials?: Record<string, string>;
    config?: Record<string, unknown>;
}

// ── Installed plugin (hydrated from DB + AVAILABLE_PLUGINS manifest) ─────────
export interface InstalledPlugin {
    id: string;
    name: string;
    description: string;
    capabilities: PluginCapability[];
    logoUrl?: string;
    providerColor?: string;
    settings: OrgPluginSettings;
}

// ── Org plugin state returned by server action ────────────────────────────────
export interface OrgPluginState {
    flags: Record<string, boolean>;
    installed: InstalledPlugin[];
}

// ── ATS Context passed to every integration execute() call ───────────────────
export interface ATSContext {
    organization_id: string;
    user_id: string;
    candidate?: Partial<CandidateType>;
    job?: Partial<JobListingType>;
    settings: Record<string, unknown>;
}

// ── Smart Trigger definition ─────────────────────────────────────────────────
export interface SmartTrigger {
    id: string;
    name: string;
    description: string;
    on: TriggerEventType[];
    condition?: (event: TriggerEvent, context: ATSContext) => boolean | Promise<boolean>;
}

// ── Integration result ────────────────────────────────────────────────────────
export interface ATSIntegrationResult {
    success: boolean;
    data?: unknown;
    error?: string;
    metadata?: Record<string, string>;
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
}

export function delayToMs(d: AutomationDelay): number {
    const factors: Record<AutomationDelay["unit"], number> = {
        seconds: 1_000,
        minutes: 60_000,
        hours: 3_600_000,
        days: 86_400_000,
    };
    return d.value * factors[d.unit];
}

export function delayLabel(d: AutomationDelay): string {
    return d.value === 0 ? "immediately" : `after ${d.value} ${d.unit === "minutes" && d.value === 1 ? "minute" : d.unit}`;
}

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
}

// ── Pending delayed execution (stored in memory / Redis / DB) ─────────────────=
export interface PendingExecution {
    id: string;
    ruleId: string;
    ruleName: string;
    scheduledAt: number;          // Date.now() + delayMs
    event: Record<string, unknown>;
    context: Record<string, unknown>;
}

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
export function interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
