import { z } from "zod";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
export const JOB_STAGES = z.enum(['New Candidate', 'Screening', 'Phone Interview', 'Interview', 'Offer', 'Applied', 'Drafted'] as const);
export const FILE_TYPES = ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"] as const;

export const CANDIDATE_STATUS = z.enum(['ACTIVE', 'REJECTED', 'HIRED'] as const);
export const JOB_STATUS = z.enum(["OPEN", "CLOSED", "DRAFT", "ARCHIVED", "PENDING"] as const);
export const JOB_TYPE = z.enum(['FULL_TIME', 'PART_TIME', 'REMOTE', 'INTERNSHIP', 'CONTRACT'] as const);
export const APPLICATION_STATUS = z.enum(['UNREAD', 'REVIEWING', 'INTERVIEWING', 'CLOSED'] as const);

export type JOB_ENUM = 'New Candidate' | 'Screening' | 'Phone Interview' | 'Interview' | 'Offer' | 'Applied' | 'Drafted';
export type CANDIDATE_ENUM = 'Active' | 'Rejected' | 'Hired';

//  FORM SCHEMAS
export const jobFormSchema = z.object({
    jobInfo: z.object({
        job_name: z.string(),
        job_description: z.string(),
        job_location: z.string(),
        department: z.string(),
        job_type: JOB_TYPE,
        organization: z.string(),
        salary_up_to: z.string(),
        salary_from: z.string().optional(),
    }).required(),
    jobTechnology: z.array(
        z.object({
            technology: z.string(),
            year_of_experience: z.string(),
        })
    ),
    jobStages: z.array(
        z.object({
            stage_name: JOB_STAGES,
            stage_assign_to: z.string(),
            color: z.string(),
            need_schedule: z.boolean().optional(),
        })),
    userId: z.string().nullish(),
});

export const updateJobListingSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    department: z.string().optional(),
    organization: z.string().optional(),
    salary_up_to: z.string().optional(),
    salary_from: z.string().optional(),
    status: JOB_STATUS.optional(),
    type: JOB_TYPE.optional(),
    jobId: z.number(),
});

const personalInfoSchema = z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "Zip code is required"),
    portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const experienceSchema = z.object({
    company: z.string().min(2, "Company name is required"),
    position: z.string().min(2, "Position is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
    period: z.string().optional(),
    total_experience: z.number().optional(),
    current: z.boolean(),
    description: z.string().min(10, "Description should be more detailed"),
});

const educationSchema = z.object({
    school: z.string().min(2, "School name is required"),
    degree: z.string().min(2, "Degree is required"),
    field_of_study: z.string().min(2, "Field of study is required"),
    graduation_date: z.string().min(1, "Graduation date is required"),
});

const referenceSchema = z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    company: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
});

export const applicationSchema = z.object({
    personalInfo: personalInfoSchema,
    workExperience: z.array(experienceSchema).min(1, "At least one experience item is required"),
    education: z.array(educationSchema).min(1, "At least one education item is required"),
    references: z.array(referenceSchema).min(0),
    additionalInfo: z.object({
        coverLetter: z.string().optional(),
        referralSource: z.string().optional(),
        expectedSalary: z.string().optional(),
        earliestStartDate: z.string().optional(),
    }),
});

// Form values for the public apply flow — shared by ApplyForm and its step
// components so their react-hook-form props stay in sync with the schema.
export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const applicationFormSchema = z.object({
    personalInfo: personalInfoSchema,
    workExperience: z.array(experienceSchema).min(1, "At least one experience item is required"),
    education: z.array(educationSchema).min(1, "At least one education item is required"),
    references: z.array(referenceSchema).optional(),
    additionalInfo: z.object({
        coverLetter: z.string().optional(),
        referralSource: z.string().optional(),
        expectedSalary: z.string().optional(),
        earliestStartDate: z.string().optional(),
    }),
    file: z.object({
        file_: z.instanceof(File),
        // file_type: z.enum(FILE_TYPES).default("RESUME")
    }).nullish(),
    candidate: z.string().nullish(),
    jobId: z.number(),
    subdomain: z.string(),
});

// ── SCREENING QUESTIONS ───────────────────────────────────────────────────
// Backend contract for the screening-questions feature. The dashboard
// (job wizard / job settings) manages questions; the public apply form
// collects answers; the application detail page renders stored answers.
// `validateScreeningAnswers` lives in src/lib/screening.ts (pure, no
// server-only imports) so both the server actions and the apply-flow
// query can use it.
export const screeningQuestionTypeSchema = z.enum([
    "short_text",
    "long_text",
    "yes_no",
    "single_choice",
    "number",
] as const);
export type ScreeningQuestionType = z.infer<typeof screeningQuestionTypeSchema>;

// One question as configured for a job. `options` is only meaningful for
// single_choice: it MUST carry 2–10 non-empty options, and every other
// type MUST NOT carry options.
export const screeningQuestionInputSchema = z
    .object({
        questionText: z.string().trim().min(1, "Question text is required").max(500, "Question text must be 500 characters or less"),
        type: screeningQuestionTypeSchema,
        options: z.array(z.string().trim().min(1, "Options must not be empty")).min(2).max(10).optional(),
        isRequired: z.boolean().default(false),
        sortOrder: z.number().int().min(0).optional(),
    })
    .superRefine((value, ctx) => {
        if (value.type === "single_choice") {
            if (!value.options || value.options.length < 2) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["options"],
                    message: "Single-choice questions require at least 2 options",
                });
            }
        } else if (value.options && value.options.length > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["options"],
                message: "Options are only allowed for single-choice questions",
            });
        }
    });
export type ScreeningQuestionInput = z.infer<typeof screeningQuestionInputSchema>;

// One answer as submitted from the public apply form. Per-type rules
// (yes/no values, single-choice membership, numeric answers) are checked
// server-side by validateScreeningAnswers, not here.
export const screeningAnswerInputSchema = z.object({
    questionId: z.number().int().positive(),
    answer: z.string().max(5000, "Answer must be 5000 characters or less"),
});
export type ScreeningAnswerInput = z.infer<typeof screeningAnswerInputSchema>;

export const updateApplicationSchema = z.object({
    applicationId: z.number(),
    job_id: z.number().optional(),
    current_stage_id: z.number().optional(),
    candidate: z.number().optional(),
    can_contact: z.boolean().optional(),
    position_in_stage: z.number().optional(),
    organization: z.string().optional(),
    subdomain: z.string().optional(),
});

export const updateApplicationStageSchema = z.object({
    applicationId: z.number(),
    new_stage_id: z.number(),
    // Server-derived from the session org — accepted but ignored when sent.
    organization: z.string().optional(),
});

export const moveAndReorderApplicationSchema = z.object({
    applicationId: z.number(),
    newStageId: z.number(),
    sourceStageId: z.number().optional(),
    targetOrders: z.array(z.object({ id: z.number(), position: z.number() })),
    sourceOrders: z.array(z.object({ id: z.number(), position: z.number() })).optional(),
});

export const newCandidateFormSchema = z.object({
    name: z.string(),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string(),
    location: z.string(),
    resume: z.string().optional(),
    // Server-derived from the session org — accepted but ignored when sent.
    organization: z.string().optional(),
    subdomain: z.string().optional(),
});

export const updateCandidateSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email({ message: "Please enter a valid email address" }).optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    cv_path: z.string().optional(),
    status: CANDIDATE_STATUS.optional(),
    profession: z.string().optional(),
    subdomain: z.string().optional(),
    organization: z.string().optional(),
});

export const departmentSchema = z.object({
    departments: z.array(z.string()),
    orgId: z.string()
});

export const interviewScheduleSchema = z.object({
    date: z.string(),
    time: z.string(),
    duration: z.string(),
    type: z.enum(["ONSITE", "VIDEO", "PHONE"]),
});

export const newInterviewSchema = z.object({
    job_id: z.number(),
    applicationId: z.number(),
    start_at: z.date(),
    end_at: z.date(),
    link: z.string().optional(),
    location: z.string(),
    type: z.enum(["ONSITE", "VIDEO", "PHONE"]),
    status: z.enum(["SCHEDULE", "AWAITING_FEEDBACK", "COMPLETE"]),
    interviewer_ids: z.array(z.string()).optional(),
    // Direct-scheduled interviews store their Google event so reschedule
    // can patch it (previously the event id was dropped, leaving the
    // calendar event unmovable). Hold rows carry these via the hold path.
    calendar_event_id: z.string().optional(),
    calendar_owner_id: z.string().optional(),
    // Calendly bookings (migration 0015): the provider that booked this
    // interview plus Calendly's own identifiers. calendar_event_id /
    // calendar_owner_id stay Google-typed and are never overloaded.
    scheduling_provider: z.enum(["google", "calendly"]).optional(),
    calendly_event_type_uri: z.string().optional(),
    calendly_event_type_name: z.string().optional(),
    calendly_event_uri: z.string().optional(),
    calendly_invitee_uri: z.string().optional(),
});

// FILTER SCHEMA
export const filterJobSchema = z.object({
    location: z.string().or(z.array(z.string())).optional(),
    keywords: z.array(z.string()).optional(),
    department: z.array(z.string()).optional(),
    salary: z.array(z.string()).optional(),
    organization: z.string(),
    status: JOB_STATUS.or(z.array(JOB_STATUS)).optional(),
    type: z.string().or(z.array(z.string())).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export const filterApplicationsSchema = z.object({
    keywords: z.array(z.string()).optional(),
    // Stage names (JOB_STAGES), multi-select — filtered with inArray.
    stages: z.array(JOB_STAGES).optional(),
    location: z.string().or(z.array(z.string())).optional(),
    department: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    organization: z.string(),
    // ?sort= for the applications list (newest / oldest / name-asc). Kept
    // as a raw string here and validated against the allowlist in the
    // query — anything else falls back to newest-first. (The jobs list
    // validates sort in its action instead; the applications action file
    // is owned by another batch, so the schema carries it through.)
    sort: z.string().optional(),
});

// Salary filter ranges for the jobs list (?salary=). Values are the URL
// values the jobs sidebar writes; the jobs query matches a job when its
// stored [salary_from, salary_up_to] range (plain numeric strings)
// overlaps the selected range. `max: null` means open-ended.
export const JOB_SALARY_RANGES = [
    { value: "under-50k", label: "Under $50k", min: 0, max: 50000 },
    { value: "50k-100k", label: "$50k – $100k", min: 50000, max: 100000 },
    { value: "100k-150k", label: "$100k – $150k", min: 100000, max: 150000 },
    { value: "150k-plus", label: "$150k+", min: 150000, max: null },
] as const;

export const filterCandidateSchema = z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    status: CANDIDATE_STATUS.or(z.array(CANDIDATE_STATUS)).optional(),
    location: z.string().or(z.array(z.string())).optional(),
    organization: z.string(),
    limit: z.number(),
    offset: z.number(),
});

// TRIGGER SCHEMA
export const locationTriggerSchema = z.object({
    location: z.string().min(1, 'Location is required'),
    stage: JOB_STAGES,
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const experienceTriggerSchema = z.object({
    experience: z.number(),
    stage: JOB_STAGES,
    delay: z.number().min(1, 'Delay must be at least 1'),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' }),
});

export const SmartEmailTriggerSchema = z.object({
    subject: z.string(),
    template: z.string(),
    body: z.string(),
    delay: z.number(),
    delayFormat: z.enum(['minutes', 'hours', 'days'], { message: 'Select a delay unit' })
});

// JOB LISTING SCHEMA
export const updateJobSchema = z.object({
    job_name: z.string(),
    job_description: z.string(),
    job_location: z.string(),
    salary_up_to: z.string(),
    department: z.string(),
    type: z.string(),
    status: JOB_STATUS
});

export const jobTechSchema = z.object({
    technology: z.string(),
    year_of_experience: z.string(),
});

export const jobStageSchema = z.object({
    stage_name: JOB_STAGES,
    stage_assign_to: z.string(),
    color: z.string(),
    need_schedule: z.boolean().optional(),
});

// NEW JOB STEPS SCHEMA
export const stepOneSchema = z.object({
    job_name: z.string(),
    job_description: z.string(),
    job_location: z.string(),
    salary_up_to: z.string(),
    salary_from: z.string().optional(),
    job_type: JOB_TYPE,
    department: z.string(),
});

export const stepTwoSchema = z.array(
    z.object({
        technology: z.string(),
        year_of_experience: z.string(),
    })
);

export const stepThreeSchema = z.array(
    z.object({
        stage_name: JOB_STAGES,
        stage_assign_to: z.string(),
        color: z.string(),
        need_schedule: z.boolean().optional(),
    })
);

// ORGANIZATION SCHEMA
export const organizationSchema = z.object({
    clerk_id: z.string(),
    name: z.string().min(3).max(100),
    subdomain: z.string().min(3).max(100),
});

// Only organizationId + emailAddress come from the client. inviterUserId
// and redirectUrl are server-derived by create_organization_invite
// (session user, Clerk default redirect) and are optional here so callers
// can't spoof them. `role` is client-requested but validated server-side
// against the org role keys before it is passed to Clerk.
export const inviteMemberSchema = z.object({
    organizationId: z.string(),
    inviterUserId: z.string().optional(),
    emailAddress: z.string().email(),
    role: z.string().optional(),
    redirectUrl: z.string().optional()
});


export const generalSettingsSchema = z.object({
    name: z.string().min(2, "Company name is required").max(100),
    locations: z.string().min(2, "Headquarters / location is required").max(255),
    phone: z.string().min(7, "Phone number is required").max(40),
    email: z.string().email("Enter a valid company email"),
    primary_color: z.string().min(2).max(40),
    font_family: z.enum(["sans", "serif", "mono"]),
    tagline: z.string().max(160, "Tagline must be 160 characters or less").optional(),
    logo_url: z.string().max(500).nullable().optional(),
    subdomain: z
        .string()
        .min(3, "Subdomain must be at least 3 characters")
        .max(63)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
});

export const subdomainSchema = z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only");

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

// ── PLUGIN SETTINGS + AUTOMATION RULES (B5) ─────────────────────────────────
// Validated at the server-action boundary (organization_actions.ts,
// plugin-actions.ts) — the plugin blob used to accept any pluginId,
// credential key, config value, and automation rule verbatim.
// ─────────────────────────────────────────────────────────────────────────────

/** Integration ids that actually exist (one class each in the providers). */
export const KNOWN_INTEGRATION_IDS = [
    "resend-application-confirmation",
    "resume-score",
] as const;
const KNOWN_INTEGRATION_ID_SET: ReadonlySet<string> = new Set(KNOWN_INTEGRATION_IDS);

/** Which integration belongs to which provider (fire_integration targets). */
const FIRE_INTEGRATION_TARGETS: Record<string, string> = {
    "resend-application-confirmation": "resend",
    "resume-score": "google",
};

/** pluginId must be one of the manifest ids in src/plugins/registry.ts. */
export const pluginIdSchema = z.string().superRefine((id, ctx) => {
    if (!AVAILABLE_PLUGINS.some((p) => p.id === id)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown plugin id "${id}"`,
        });
    }
});

/** Credential keys allowlisted per plugin — anything else is rejected. */
export const PLUGIN_CREDENTIAL_KEYS: Record<string, readonly string[]> = {
    resend: ["apiKey"],
    google: ["apiKey", "orgId"],
    calendly: ["apiKey", "webhookSigningKey"],
};

/** Known config keys per plugin, with per-field typing. */
const PLUGIN_CONFIG_KEYS: Record<string, readonly string[]> = {
    resend: ["fromAddress", "companyName", "hiringManagerEmail", "recruiterEmail", "offerSigningUrl"],
    google: [],
    indeed: ["indeedAccountEmail"],
    linkedin: ["pageUrl"],
    calendly: ["userName", "userEmail", "userUri", "webhookSubscriptionUri", "webhookEnabled"],
};

const emailFieldIssue = (
    ctx: z.RefinementCtx,
    config: Record<string, unknown>,
    key: string,
    label: string,
) => {
    const value = config[key];
    if (value === undefined || value === "") return;
    if (typeof value !== "string" || !z.string().email().safeParse(value).success) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${label} must be a valid email address`,
        });
    }
};

/**
 * One org's stored settings for a plugin. Unknown top-level keys are
 * stripped (zod default); credential/config keys are allowlisted and
 * config fields are typed, so a bad save fails with a clear message
 * instead of persisting garbage.
 */
export const orgPluginSettingsSchema = (pluginId: string) =>
    z.object({
        active: z.boolean().optional(),
        credentials: z
            .record(z.string(), z.string())
            .optional()
            .superRefine((creds, ctx) => {
                const allowed = PLUGIN_CREDENTIAL_KEYS[pluginId] ?? [];
                for (const key of Object.keys(creds ?? {})) {
                    if (!allowed.includes(key)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: [key],
                            message: `Unknown credential "${key}" for plugin "${pluginId}" (allowed: ${allowed.join(", ") || "none"})`,
                        });
                    }
                }
            }),
        config: z
            .record(z.string(), z.unknown())
            .optional()
            .superRefine((config, ctx) => {
                const cfg = config ?? {};
                const allowed = PLUGIN_CONFIG_KEYS[pluginId] ?? [];
                for (const key of Object.keys(cfg)) {
                    if (!allowed.includes(key)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: [key],
                            message: `Unknown config field "${key}" for plugin "${pluginId}"`,
                        });
                    }
                }
                emailFieldIssue(ctx, cfg, "fromAddress", "From address");
                emailFieldIssue(ctx, cfg, "hiringManagerEmail", "Hiring manager email");
                emailFieldIssue(ctx, cfg, "recruiterEmail", "Recruiter email");
                emailFieldIssue(ctx, cfg, "indeedAccountEmail", "Indeed account email");
                emailFieldIssue(ctx, cfg, "userEmail", "Calendly user email");
                const companyName = cfg["companyName"];
                if (companyName !== undefined && companyName !== "" && typeof companyName !== "string") {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["companyName"],
                        message: "Company name must be a string",
                    });
                }
                const offerSigningUrl = cfg["offerSigningUrl"];
                if (typeof offerSigningUrl === "string" && offerSigningUrl !== "") {
                    let url: URL | null = null;
                    try {
                        url = new URL(offerSigningUrl);
                    } catch {
                        url = null;
                    }
                    if (!url || url.protocol !== "https:") {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ["offerSigningUrl"],
                            message: "Offer signing URL must be a valid https URL",
                        });
                    }
                } else if (offerSigningUrl !== undefined && offerSigningUrl !== "") {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["offerSigningUrl"],
                        message: "Offer signing URL must be a valid https URL",
                    });
                }
            }),
        enabledIntegrations: z
            .record(z.string(), z.boolean())
            .optional()
            .superRefine((map, ctx) => {
                for (const key of Object.keys(map ?? {})) {
                    if (!KNOWN_INTEGRATION_ID_SET.has(key)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: [key],
                            message: `Unknown integration id "${key}"`,
                        });
                    }
                }
            }),
    });
export type OrgPluginSettingsInput = z.infer<ReturnType<typeof orgPluginSettingsSchema>>;

// ── AUTOMATION RULES ─────────────────────────────────────────────────────────
export const automationDelaySchema = z.object({
    value: z.number().finite().min(0, "Delay value must be 0 or more"),
    unit: z.enum(["seconds", "minutes", "hours", "days"]),
});

export const automationTriggerSchema = z.discriminatedUnion("event", [
    z.object({
        event: z.literal("stage_changed"),
        toStage: JOB_STAGES,
        fromStage: JOB_STAGES.optional(),
    }),
    z.object({ event: z.literal("candidate_applied") }),
    z.object({ event: z.literal("resume_uploaded") }),
    z.object({ event: z.literal("offer_extended") }),
    z.object({ event: z.literal("interview_scheduled") }),
]);

export const automationActionSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("add_note"),
        content: z.string().min(1, "Note content is required"),
        pinned: z.boolean().optional(),
    }),
    z.object({
        type: z.literal("send_sms"),
        to: z.enum(["candidate", "recruiter", "hiring_manager"]),
        message: z.string().min(1, "SMS message is required"),
    }),
    z.object({
        type: z.literal("send_email"),
        to: z.enum(["candidate", "recruiter", "hiring_manager"]),
        subject: z.string().min(1, "Email subject is required"),
        body: z.string().min(1, "Email body is required"),
        integrationId: z
            .string()
            .superRefine((id, ctx) => {
                if (!KNOWN_INTEGRATION_ID_SET.has(id)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Unknown integration id "${id}"`,
                    });
                }
            })
            .optional(),
    }),
    z.object({
        type: z.literal("fire_integration"),
        providerId: z.string(),
        integrationId: z.string(),
    }),
    z.object({
        type: z.literal("move_stage"),
        toStage: JOB_STAGES,
    }),
    z.object({
        type: z.literal("assign_recruiter"),
        userId: z.string().min(1, "Assignee user id is required"),
    }),
]).superRefine((action, ctx) => {
    // fire_integration targets must name a real integration on its real
    // provider — checked here (on the union, not the option) because a
    // refined option is no longer a valid discriminated-union member.
    if (action.type !== "fire_integration") return;
    const expectedProvider = FIRE_INTEGRATION_TARGETS[action.integrationId];
    if (!expectedProvider) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["integrationId"],
            message: `Unknown integration id "${action.integrationId}"`,
        });
    } else if (action.providerId !== expectedProvider) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["providerId"],
            message: `Integration "${action.integrationId}" belongs to provider "${expectedProvider}", not "${action.providerId}"`,
        });
    }
});

export const automationRuleSchema = z.object({
    id: z.string().min(1),
    job_id: z.number().int().positive(),
    name: z.string().trim().min(1, "Rule name is required").max(200),
    enabled: z.boolean(),
    trigger: automationTriggerSchema,
    delay: automationDelaySchema,
    action: automationActionSchema,
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
export type AutomationRuleInput = z.infer<typeof automationRuleSchema>;
