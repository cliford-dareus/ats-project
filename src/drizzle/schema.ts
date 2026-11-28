import { int, mysqlTable, varchar, mysqlEnum, timestamp, boolean, json, unique, uniqueIndex, index, text } from 'drizzle-orm/mysql-core';
import { relations } from "drizzle-orm";
import { createId } from '@paralleldrive/cuid2';

export const organization = mysqlTable('organization', {
    clerk_id: varchar({ length: 255 }).notNull().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    locations: varchar({ length: 255 }).notNull().default("New-York"),
    phone: varchar({ length: 255 }).notNull().default("305-555-0100"),
    email: varchar({ length: 255 }).notNull().default("company@example.com"),
    primary_color: varchar({ length: 255 }).notNull().default("purple"),
    font_family: varchar({ length: 255 }).notNull().default("sans"),
    subdomain: varchar({ length: 255 }).notNull().unique(),
    logo_url: varchar({ length: 500 }),
    tagline: varchar({ length: 160 }),
    plugins: json('plugins').notNull().default({ enabled: [], settings: {} }),
    theme: json('theme'),
});

export const organization_relations = relations(organization, ({ many }) => ({
    departments: many(departments),
    members: many(organization_member),
    job_listings: many(job_listings),
    automation_rules: many(automation_rules),
    activity_logs: many(activity_log),
}));

export const departments = mysqlTable('departments', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({ length: 255 }).notNull(),
});

export const departments_relations = relations(departments, ({ many }) => ({
    job_listings: many(job_listings),
    org_links: many(org_to_department),
}));

export const org_to_department = mysqlTable('org_to_department', {
    id: int('id').primaryKey().autoincrement(),
    department_id: int('department_id').notNull().references(() => departments.id),
    organization_id: varchar({ length: 255 }).notNull().references(() => organization.clerk_id),
}, (table) => ({
    unique_org_dept: unique('unique_org_dept').on(table.department_id, table.organization_id),
}));

export const org_to_department_relations = relations(org_to_department, ({ one }) => ({
    department: one(departments, {
        fields: [org_to_department.department_id],
        references: [departments.id],
    }),
    organization: one(organization, {
        fields: [org_to_department.organization_id],
        references: [organization.clerk_id],
    }),
}));

export const users_table = mysqlTable(
    'users_table',
    {
        id: varchar({ length: 255 }).primaryKey(),
        name: varchar({ length: 255 }).notNull(),
        email: varchar({ length: 255 }).notNull().unique(),
        image_url: varchar('image_url', { length: 512 }),
        username: varchar({ length: 64 }),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        username_idx: index('users_username_idx').on(table.username),
    })
);

export const usersTable = users_table;

export const users_table_relations = relations(users_table, ({ many }) => ({
    assignments: many(stages),
    memberships: many(organization_member),
}));

export const organization_member = mysqlTable(
    'organization_member',
    {
        id: int().primaryKey().autoincrement(),
        user_id: varchar('user_id', { length: 255 })
            .notNull()
            .references(() => users_table.id, { onDelete: 'cascade' }),
        organization_id: varchar('organization_id', { length: 255 })
            .notNull()
            .references(() => organization.clerk_id, { onDelete: 'cascade' }),
        role: varchar({ length: 64 }).notNull().default('org:member'),
        created_at: timestamp('created_at').defaultNow().notNull(),
    },
    (t) => ({
        unique_user_org: unique('unique_user_org').on(t.user_id, t.organization_id),
        org_idx: index('org_members_org_idx').on(t.organization_id),
    })
);

export const organization_member_relations = relations(organization_member, ({ one }) => ({
    user: one(users_table, {
        fields: [organization_member.user_id],
        references: [users_table.id],
    }),
    organization: one(organization, {
        fields: [organization_member.organization_id],
        references: [organization.clerk_id],
    }),
}));

export const job_listings = mysqlTable('job_listing', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({ length: 255 }).notNull(),
    location: varchar({ length: 255 }).notNull(),
    description: text('description').notNull(),
    salary_up_to: varchar({ length: 255 }).notNull(),
    salary_from: varchar({ length: 255 }),
    department: int().notNull(),
    subdomain: varchar({ length: 255 }).notNull(),
    organization: varchar({ length: 255 }).notNull(),
    status: mysqlEnum('status', ["OPEN", "CLOSED", "DRAFT", "ARCHIVED", "PENDING"]).default('PENDING'),
    type: mysqlEnum('type', ['FULL_TIME', 'PART_TIME', 'REMOTE', 'INTERNSHIP', 'CONTRACT']).default("FULL_TIME"),
    created_by: varchar('created_by', { length: 255 }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    // Soft-delete (Trash): NULL while live; set to the delete time when the
    // job is moved to Trash. Restoring clears it. Existing rows get NULL.
    deleted_at: timestamp('deleted_at'),
});

export const job_listings_relations = relations(job_listings, ({ many, one }) => ({
    stages: many(stages),
    candidates: many(candidates),
    job_to_technologies: many(job_technologies),
    screening_questions: many(screening_questions),
    departments: one(departments, {
        fields: [job_listings.department],
        references: [departments.id],
    }),
    organization: one(organization, {
        fields: [job_listings.organization],
        references: [organization.clerk_id],
    }),
    automation: many(automation_rules),
    syndication: many(job_syndication),
}));

export const job_listingsRelations = job_listings_relations;

// ── Job-board syndication ───────────────────────────────────────────────────
// One row per (job, board): the recruiter's publish intent + the outcome
// for that board. Indeed is feed-based — a row with status 'syndicated'
// puts the job in the org's public Indeed XML feed (see
// src/lib/indeed-feed.ts); 'posted' is only ever set for LinkedIn, by a
// human marking a manual post live with its URL. Rows are deleted with
// the job (ON DELETE CASCADE); a trashed job is never in the feed even
// while its row survives.
export const job_syndication = mysqlTable('job_syndication', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int('job_id').notNull().references(() => job_listings.id, { onDelete: 'cascade' }),
    board_id: varchar('board_id', { length: 32 }).notNull(),
    status: mysqlEnum('status', ['not_syndicated', 'syndicated', 'failed', 'posted']).default('not_syndicated').notNull(),
    external_url: varchar('external_url', { length: 500 }),
    error_message: text('error_message'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    job_board_unique: uniqueIndex('job_syndication_job_board_unique').on(table.job_id, table.board_id),
}));

export const job_syndication_relations = relations(job_syndication, ({ one }) => ({
    job: one(job_listings, {
        fields: [job_syndication.job_id],
        references: [job_listings.id],
    }),
}));

export const technologies = mysqlTable('technologies', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({ length: 255 }).notNull(),
    years_experience: int(),
});

export const technologies_relations = relations(technologies, ({ many }) => ({
    job_to_technologies: many(job_technologies),
}));

export const job_technologies = mysqlTable('job_technologies', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().notNull().references(() => job_listings.id, { onDelete: 'cascade' }),
    technology_id: int().notNull().references(() => technologies.id, { onDelete: 'cascade' }),
});

export const job_technologies_relations = relations(job_technologies, ({ one }) => ({
    job: one(job_listings, {
        fields: [job_technologies.job_id],
        references: [job_listings.id],
    }),
    technology: one(technologies, {
        fields: [job_technologies.technology_id],
        references: [technologies.id],
    }),
}));

export const job_technology_relation = job_technologies_relations;

export const stages = mysqlTable('stages', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().notNull().references(() => job_listings.id, { onDelete: 'cascade' }),
    stage_name: mysqlEnum('stage_name', ['Applied', 'New Candidate', 'Screening', 'Phone Interview', 'Interview', 'Offer', "Drafted"]),
    stage_order_id: int().notNull(),
    color: varchar({ length: 255 }),
    need_schedule: boolean().default(true),
    assign_to: varchar({ length: 255 }).references(() => users_table.id, { onDelete: 'set null' }),
}, (table) => ({
    job_stage_unique: index("job_stage_unique").on(table.job_id, table.stage_name),
    stages_job_idx: index("stages_job_idx").on(table.job_id),
}));

export const stages_relations = relations(stages, ({ one, many }) => ({
    applications: many(applications),
    job: one(job_listings, {
        fields: [stages.job_id],
        references: [job_listings.id],
    }),
    assign_to: one(users_table, {
        fields: [stages.assign_to],
        references: [users_table.id],
    }),
}));

export const stagesRelations = stages_relations;

export const automation_rules = mysqlTable('automation_rule', {
    id: varchar('id', { length: 30 }).primaryKey().$defaultFn(() => `AUT-${createId()}`).notNull(),
    job_id: int().notNull().references(() => job_listings.id, { onDelete: 'cascade' }),
    org_id: varchar("org_id", { length: 255 }).notNull().references(() => organization.clerk_id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    enabled: boolean().default(true),
    trigger: json('trigger').notNull().default({ template: '', options: [], delay: 1, delayFormat: 'minutes' }),
    delay: json('delay').notNull().default({ template: '', options: [], delay: 1, delayFormat: 'minutes' }),
    action: json('action').notNull().default({ template: '', options: [], delay: 1, delayFormat: 'minutes' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    job_automation_index: index("job_automation_index").on(table.job_id),
    org_automation_index: index("org_automation_index").on(table.org_id),
}));

export const automation_rules_relations = relations(automation_rules, ({ one }) => ({
    job: one(job_listings, { fields: [automation_rules.job_id], references: [job_listings.id] }),
    organization: one(organization, { fields: [automation_rules.org_id], references: [organization.clerk_id] }),
}));

export const candidates = mysqlTable('candidate', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 255 }).notNull(),
    cv_path: varchar({ length: 255 }).notNull(),
    subdomain: varchar({ length: 255 }).notNull(),
    location: varchar({ length: 255 }).notNull(),
    address: varchar({ length: 255 }).notNull(),
    city: varchar({ length: 255 }).notNull(),
    state: varchar({ length: 255 }).notNull(),
    zip_code: varchar({ length: 255 }).notNull(),
    organization: varchar({ length: 255 }).notNull(),
    // Collected on the public apply form (personal info step); null when the
    // candidate never provided them.
    portfolio_url: varchar('portfolio_url', { length: 255 }),
    linkedin_url: varchar('linkedin_url', { length: 255 }),
    status: mysqlEnum('status', ['ACTIVE', 'REJECTED', 'HIRED']).default('ACTIVE'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    // Soft-delete (Trash): NULL while live; set when moved to Trash.
    deleted_at: timestamp('deleted_at'),
});

export const candidates_relations = relations(candidates, ({ many }) => ({
    applications: many(applications),
    attachments: many(attachments),
    portal_tokens: many(candidate_portal_tokens),
    sms_consents: many(sms_consents),
}));

// ── Candidate portal tokens ─────────────────────────────────────────────
// Magic-link tokens for the candidate portal (src/server/portal/).
// Unlike interview hold tokens (stored PLAINTEXT in interviews.hold_token),
// portal tokens are stored ONLY as a sha256 hex hash — the raw token is
// shown to the candidate once (in the emailed link) and never persisted
// or logged. One live token per candidate: creating a token revokes all
// prior non-expired, non-revoked tokens for that candidate.
export const candidate_portal_tokens = mysqlTable('candidate_portal_tokens', {
    id: int('id').primaryKey().autoincrement(),
    candidate_id: int('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
    token_hash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expires_at: timestamp('expires_at').notNull(),
    revoked_at: timestamp('revoked_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    candidate_idx: index('candidate_portal_tokens_candidate_idx').on(table.candidate_id),
}));

export const candidate_portal_tokens_relations = relations(candidate_portal_tokens, ({ one }) => ({
    candidate: one(candidates, {
        fields: [candidate_portal_tokens.candidate_id],
        references: [candidates.id],
    }),
}));

export const attachments = mysqlTable('attachments', {
    id: int('id').primaryKey().autoincrement(),
    file_name: varchar({ length: 255 }).notNull(),
    file_url: varchar({ length: 255 }).notNull(),
    candidate_id: int().notNull().references(() => candidates.id, { onDelete: 'cascade' }),
    attachment_type: mysqlEnum('attachment_type', ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"]),
});

export const attachments_relations = relations(attachments, ({ one }) => ({
    candidates: one(candidates, { fields: [attachments.candidate_id], references: [candidates.id] }),
}));

export const applications = mysqlTable('applications', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().references(() => job_listings.id),
    current_stage_id: int().references(() => stages.id),
    candidate: int().references(() => candidates.id, { onDelete: 'cascade' }),
    can_contact: boolean().default(false),
    position_in_stage: int("position_in_stage").notNull().default(0),
    organization: varchar({ length: 255 }).notNull(),
    subdomain: varchar({ length: 255 }).notNull(),

    // Collected on the public apply form (review/additional step); null when
    // the candidate never provided them.
    cover_letter: text('cover_letter'),
    referral_source: varchar('referral_source', { length: 255 }),
    expected_salary: varchar('expected_salary', { length: 255 }),
    earliest_start_date: varchar('earliest_start_date', { length: 255 }),

    resume_score: int("resume_score"),
    resume_score_fit: int("resume_score_fit"),
    resume_score_skills: int("resume_score_skills"),
    resume_score_exp: int("resume_score_experience"),
    resume_score_summary: text("resume_score_summary"),
    resume_scored_at: timestamp("resume_scored_at"),
    resume_score_model: text("resume_score_model"),

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    // Soft-delete (Trash): NULL while live; set when moved to Trash.
    deleted_at: timestamp('deleted_at'),
}, (table) => ({
    stage_position_idx: index("stage_position_idx").on(
        table.current_stage_id,
        table.position_in_stage
    ),
    applications_job_idx: index("applications_job_idx").on(table.job_id),
    candidate_idx: index("candidate_idx").on(table.candidate),
    // Race-safe duplicate guard: one application per (job, candidate).
    // create_application checks first and returns a friendly message, but
    // the constraint is what makes it hold under concurrent submits.
    application_job_candidate_unique: uniqueIndex("application_job_candidate_unique").on(
        table.job_id,
        table.candidate
    ),
}));

// ── Checkr background checks (migration 0016) ───────────────────────────
// One row per application: the outcome of the single background check
// ordered for that application. Statuses are stored EXACTLY as Checkr
// reports them — invitation_status is Checkr's invitation status
// (pending/completed/expired; 'canceled' is Applico-local, set when a
// recruiter cancels a still-pending invitation), report_status /
// report_result / adjudication are Checkr's report fields verbatim
// (pending/complete/suspended/dispute/canceled; clear/consider;
// engaged/pre_adverse_action/post_adverse_action). Nothing here is
// polled live: refresh_checkr_check_action re-reads Checkr on demand.
//
// Consent: a check may only be initiated after a recruiter confirms the
// candidate's FCRA disclosure + written authorization was obtained
// (consent_confirmed_by/at). Applico does NOT store the signed form —
// the org retains it, and Checkr's hosted apply flow collects the
// candidate's consent again before any screening runs. Never set a
// report status/result here except from a real Checkr API response.
export const checkr_background_checks = mysqlTable('checkr_background_checks', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    // Denormalized Clerk org id (same pattern as interviews.organization)
    // so a check row is provably org-scoped without joining applications.
    organization: varchar('organization', { length: 255 }).notNull(),
    // 'test' = api.checkr-staging.com (no real checks, no charges);
    // 'live' = api.checkr.com (real checks, billable). Stored per check
    // so a row can never be misread as live when it ran in staging.
    environment: mysqlEnum('environment', ['test', 'live']).notNull().default('test'),
    package_slug: varchar('package_slug', { length: 128 }).notNull(),
    checkr_candidate_id: varchar('checkr_candidate_id', { length: 128 }),
    checkr_invitation_id: varchar('checkr_invitation_id', { length: 128 }),
    checkr_report_id: varchar('checkr_report_id', { length: 128 }),
    invitation_status: mysqlEnum('invitation_status', ['pending', 'completed', 'expired', 'canceled']),
    report_status: mysqlEnum('report_status', ['pending', 'complete', 'suspended', 'dispute', 'canceled']),
    report_result: mysqlEnum('report_result', ['clear', 'consider']),
    adjudication: mysqlEnum('adjudication', ['engaged', 'pre_adverse_action', 'post_adverse_action']),
    invitation_url: varchar('invitation_url', { length: 500 }),
    invitation_expires_at: timestamp('invitation_expires_at'),
    report_completed_at: timestamp('report_completed_at'),
    consent_confirmed_by: varchar('consent_confirmed_by', { length: 255 }),
    consent_confirmed_at: timestamp('consent_confirmed_at'),
    error_message: text('error_message'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One check per application: re-initiating (e.g. after expiry)
    // updates this row instead of creating a second one.
    application_unique: uniqueIndex('checkr_application_unique').on(table.application_id),
    org_idx: index('checkr_org_idx').on(table.organization),
}));

export const checkr_background_checks_relations = relations(checkr_background_checks, ({ one }) => ({
    application: one(applications, {
        fields: [checkr_background_checks.application_id],
        references: [applications.id],
    }),
}));

// ── Twilio SMS consent ────────────────────────────────────────────────────
// One row per (candidate, organization): whether this org may text the
// candidate about their applications. Consent is an auditable EVENT
// (who recorded it, when, how) — not a static attribute — so it lives
// in its own table rather than as a boolean on `candidate`: a column
// would conflate "never asked" with "declined", lose the opt-out
// history (a STOP reply or recruiter-recorded opt-out must not erase
// who recorded the original opt-in), and the candidates table is
// written by the public apply flow, which has no SMS opt-in yet.
//   • source 'recruiter' — a recruiter recorded it on the application
//     page (the only writable source today; who/when is the audit trail).
//   • source 'apply_form' — reserved: the apply form gains an SMS
//     opt-in checkbox, which writes here with recorded_by NULL.
//   • source 'sms_reply' — reserved: an inbound Twilio webhook for
//     STOP/START replies (no webhook receiver exists yet).
// No consent row = no consent: the automation send_sms action and the
// manual send card both refuse to text the candidate until a row with
// status 'consented' exists. One row per candidate+org (upsert on
// change) — the current status is the row; history beyond the latest
// change is the activity log (twilio_sms_consent_recorded/revoked).
export const sms_consents = mysqlTable('sms_consents', {
    id: int('id').primaryKey().autoincrement(),
    candidate_id: int('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
    // Denormalized Clerk org id (same pattern as checkr_background_checks)
    // so a consent row is provably org-scoped without joining candidates.
    organization: varchar('organization', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['consented', 'opted_out']).notNull().default('consented'),
    source: mysqlEnum('source', ['apply_form', 'recruiter', 'sms_reply']).notNull().default('recruiter'),
    // Clerk user id that recorded this status (NULL for apply_form /
    // sms_reply sources, which have no staff actor).
    recorded_by: varchar('recorded_by', { length: 255 }),
    recorded_at: timestamp('recorded_at').defaultNow().notNull(),
    note: varchar('note', { length: 500 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One consent row per candidate per org: re-recording (opt-out,
    // re-opt-in) updates this row instead of creating a second one.
    candidate_org_unique: uniqueIndex('sms_consents_candidate_org_unique').on(table.candidate_id, table.organization),
    org_idx: index('sms_consents_org_idx').on(table.organization),
}));

export const sms_consents_relations = relations(sms_consents, ({ one }) => ({
    candidate: one(candidates, {
        fields: [sms_consents.candidate_id],
        references: [candidates.id],
    }),
}));
// ── DocuSign offer-letter envelopes (migration 0020) ──────────────────
// One row per application: the outcome of the single offer letter sent
// for e-signature for that application. envelope_status and
// recipient_status are stored EXACTLY as DocuSign reports them — as
// free-text varchar, not an enum, so a status DocuSign adds later is
// stored verbatim instead of failing the write. Envelope: created /
// sent / delivered / signed / completed / declined / voided. Signer:
// sent / delivered / completed / declined / authenticationfailed /
// autofailed. Nothing here is polled live:
// refresh_docusign_envelope_action re-reads DocuSign on demand.
//
// The offer letter itself lives in DocuSign as a template (template_id
// + template_role_name): Applico never generates offer-letter PDFs and
// never invents document content. The template's signer role is bound
// to the candidate's name/email at send time; DocuSign emails the
// candidate the signing link.
//
// Consent: sending is a deliberate recruiter action from the Offer
// stage, confirmed in the UI (sent_by/at records who confirmed and
// when). Never set an envelope status here except from a real DocuSign
// API response — "completed" is only ever DocuSign's word for it.
export const docusign_envelopes = mysqlTable('docusign_envelopes', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    // Denormalized Clerk org id (same pattern as interviews.organization)
    // so an envelope row is provably org-scoped without joining applications.
    organization: varchar('organization', { length: 255 }).notNull(),
    // 'demo' = account-d.docusign.com / demo.docusign.net (test
    // signatures, no legal weight); 'production' = account.docusign.com
    // (real, legally-binding signatures). Stored per envelope so a row
    // can never be misread as production when it ran in demo.
    environment: mysqlEnum('environment', ['demo', 'production']).notNull().default('demo'),
    template_id: varchar('template_id', { length: 128 }).notNull(),
    template_role_name: varchar('template_role_name', { length: 128 }).notNull().default('Candidate'),
    envelope_id: varchar('envelope_id', { length: 128 }),
    // DocuSign's verbatim envelope status (see header comment).
    envelope_status: varchar('envelope_status', { length: 32 }),
    // DocuSign's verbatim status of the first signer (the candidate).
    recipient_status: varchar('recipient_status', { length: 32 }),
    recipient_name: varchar('recipient_name', { length: 255 }),
    recipient_email: varchar('recipient_email', { length: 255 }),
    email_subject: varchar('email_subject', { length: 500 }),
    sent_by: varchar('sent_by', { length: 255 }),
    sent_at: timestamp('sent_at'),
    completed_at: timestamp('completed_at'),
    declined_at: timestamp('declined_at'),
    // DocuSign truncates voidedReason to 200 characters.
    voided_reason: varchar('voided_reason', { length: 200 }),
    error_message: text('error_message'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One envelope per application: re-sending (e.g. after a decline)
    // updates this row instead of creating a second one.
    application_unique: uniqueIndex('docusign_application_unique').on(table.application_id),
    org_idx: index('docusign_org_idx').on(table.organization),
}));

export const docusign_envelopes_relations = relations(docusign_envelopes, ({ one }) => ({
    application: one(applications, {
        fields: [docusign_envelopes.application_id],
        references: [applications.id],
    }),
}));
// ── WhatsApp messaging (plugin `whatsapp`, migration 0022) ────────────────
// Consent and delivery log for WhatsApp messages sent via Twilio's
// WhatsApp API. Consent is per (organization, candidate): a candidate
// may only be messaged while a consent row exists with consented_at set
// and revoked_at NULL. There is NO shared consent with the Twilio SMS
// plugin (built in parallel, no shared storage in the tree) — WhatsApp
// consent is recorded here, explicitly, and never inferred from SMS
// consent or from the candidate merely having a phone number.
// Statuses on whatsapp_messages are Twilio's verbatim message statuses
// (queued / sent / delivered / undelivered / failed) — never invented:
// a row's status is only ever set from a real Twilio API response.
export const whatsapp_consents = mysqlTable('whatsapp_consents', {
    id: int('id').primaryKey().autoincrement(),
    organization: varchar('organization', { length: 255 }).notNull(),
    candidate_id: int('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
    // E.164 phone the consent covers, as normalized at record time.
    phone_e164: varchar('phone_e164', { length: 32 }).notNull(),
    // How consent was obtained ('manual' = recruiter confirmed it out of
    // band, e.g. on a call or on the apply form; 'application_form' =
    // candidate opted in on the application). The signed/opt-in record
    // itself lives with the org — Applico stores who/when, not the form.
    source: varchar('source', { length: 64 }).notNull().default('manual'),
    consented_by: varchar('consented_by', { length: 255 }),
    consented_at: timestamp('consented_at'),
    revoked_by: varchar('revoked_by', { length: 255 }),
    revoked_at: timestamp('revoked_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One consent record per candidate per org: re-consenting (e.g. after
    // a revoke) updates this row instead of creating a second one.
    org_candidate_unique: uniqueIndex('whatsapp_consents_org_candidate_unique').on(table.organization, table.candidate_id),
    org_idx: index('whatsapp_consents_org_idx').on(table.organization),
}));

export const whatsapp_consents_relations = relations(whatsapp_consents, ({ one }) => ({
    candidate: one(candidates, {
        fields: [whatsapp_consents.candidate_id],
        references: [candidates.id],
    }),
}));

export const whatsapp_messages = mysqlTable('whatsapp_messages', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    // Denormalized Clerk org id (same pattern as interviews.organization
    // and checkr_background_checks.organization) so a message row is
    // provably org-scoped without joining applications.
    organization: varchar('organization', { length: 255 }).notNull(),
    candidate_id: int('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
    to_phone: varchar('to_phone', { length: 32 }).notNull(),
    // Twilio Content Template SID (HX…) actually sent — the template
    // itself lives in Twilio's Content Template Builder and must be
    // approved by Meta before it can deliver.
    template_content_sid: varchar('template_content_sid', { length: 64 }).notNull(),
    // Template variables as sent ({"1": "...", "2": "..."}).
    template_variables: json('template_variables').notNull().default({}),
    twilio_message_sid: varchar('twilio_message_sid', { length: 64 }),
    // Twilio's verbatim status, refreshed on demand from the card.
    status: varchar('status', { length: 32 }),
    error_message: text('error_message'),
    sent_by: varchar('sent_by', { length: 255 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    org_idx: index('whatsapp_messages_org_idx').on(table.organization),
    application_idx: index('whatsapp_messages_application_idx').on(table.application_id),
}));

export const whatsapp_messages_relations = relations(whatsapp_messages, ({ one }) => ({
    application: one(applications, {
        fields: [whatsapp_messages.application_id],
        references: [applications.id],
    }),
    candidate: one(candidates, {
        fields: [whatsapp_messages.candidate_id],
        references: [candidates.id],
    }),
}));

// ── Sterling background checks (migration 0023) ─────────────────────────
// One row per application: the outcome of the single background check
// ordered for that application. Statuses/results are stored EXACTLY as
// Sterling reports them (see src/server/sterling.ts header for the
// verbatim lists) — status / sub_status / result are varchar, not enums,
// because Sterling's list is long, contains spaces, and may grow per
// account configuration (CMA scoring, adverse-action states). Nothing
// here is polled live: refresh_sterling_check_action re-reads Sterling
// on demand (GET /screenings/{id}).
//
// Consent: a check may only be initiated after a recruiter confirms the
// candidate's FCRA disclosure + written authorization was obtained
// (consent_confirmed_by/at). Applico does NOT store the signed form —
// the org retains it, and Sterling's Candidate Hub collects the
// candidate's consent again before any screening runs. Never set a
// status/result here except from a real Sterling API response.
// There is no cancel column: Sterling documents no DELETE /screenings
// endpoint — cancellation happens in the Sterling portal.
export const sterling_background_checks = mysqlTable('sterling_background_checks', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    // Denormalized Clerk org id (same pattern as interviews.organization)
    // so a check row is provably org-scoped without joining applications.
    organization: varchar('organization', { length: 255 }).notNull(),
    // 'test' = api.us.int.sterlingcheck.app (Integration, no real checks,
    // no charges); 'live' = api.us.sterlingcheck.app (real checks,
    // billable). Stored per check so a row can never be misread as live
    // when it ran in Integration.
    environment: mysqlEnum('environment', ['test', 'live']).notNull().default('test'),
    package_id: varchar('package_id', { length: 128 }).notNull(),
    package_name: varchar('package_name', { length: 255 }),
    sterling_candidate_id: varchar('sterling_candidate_id', { length: 128 }),
    sterling_screening_id: varchar('sterling_screening_id', { length: 128 }),
    status: varchar('status', { length: 64 }),
    sub_status: varchar('sub_status', { length: 64 }),
    result: varchar('result', { length: 32 }),
    // Sterling's admin interactive-summary link (links.admin.web).
    report_url: varchar('report_url', { length: 500 }),
    // Candidate Hub form URL — only when Sterling returned one
    // (invite.method "link"); null otherwise. Never synthesized.
    invite_url: varchar('invite_url', { length: 500 }),
    invite_method: mysqlEnum('invite_method', ['email', 'link']).notNull().default('email'),
    submitted_at: timestamp('submitted_at'),
    estimated_completion_at: timestamp('estimated_completion_at'),
    consent_confirmed_by: varchar('consent_confirmed_by', { length: 255 }),
    consent_confirmed_at: timestamp('consent_confirmed_at'),
    error_message: text('error_message'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One check per application: re-initiating (e.g. after an expired
    // invite) updates this row instead of creating a second one.
    application_unique: uniqueIndex('sterling_application_unique').on(table.application_id),
    org_idx: index('sterling_org_idx').on(table.organization),
}));

export const sterling_background_checks_relations = relations(sterling_background_checks, ({ one }) => ({
    application: one(applications, {
        fields: [sterling_background_checks.application_id],
        references: [applications.id],
    }),
}));

export const applications_relations = relations(applications, ({ one, many }) => ({
    interviews: many(interviews),
    score: many(score_cards),
    interview_prep: many(interview_prep),
    screening_answers: many(screening_answers),
    checkr_check: one(checkr_background_checks, {
        fields: [applications.id],
        references: [checkr_background_checks.application_id],
    }),
    docusign_envelope: one(docusign_envelopes, {
        fields: [applications.id],
        references: [docusign_envelopes.application_id],
    }),
    whatsapp_messages: many(whatsapp_messages),
    sterling_check: one(sterling_background_checks, {
        fields: [applications.id],
        references: [sterling_background_checks.application_id],
    }),
    candidates: one(candidates, { fields: [applications.candidate], references: [candidates.id] }),
    job: one(job_listings, { fields: [applications.job_id], references: [job_listings.id] }),
    stage: one(stages, {
        fields: [applications.current_stage_id],
        references: [stages.id],
    }),
}));

// ── Screening questions & answers ─────────────────────────────────────────
// Questions are configured per job by the hiring team (dashboard) and
// answered by applicants on the public apply form.
//
// Snapshot rationale: `screening_answers` stores `question_text`,
// `question_type` and `sort_order` as they were at answer time, so an
// answer stays readable if the question is later edited, reordered or
// deleted. `question_id` is ON DELETE SET NULL (not CASCADE) so deleting
// a question never deletes answers — the snapshot columns are what the
// application detail page renders.
export const screening_questions = mysqlTable('screening_questions', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int('job_id').notNull().references(() => job_listings.id, { onDelete: 'cascade' }),
    question_text: text('question_text').notNull(),
    type: mysqlEnum('type', ['short_text', 'long_text', 'yes_no', 'single_choice', 'number']).notNull(),
    // Only used for single_choice — a JSON array of option strings.
    // NULL / empty for every other type (enforced in zod).
    options: json('options').$type<string[]>(),
    is_required: boolean('is_required').notNull().default(false),
    sort_order: int('sort_order').notNull().default(0),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    job_idx: index('screening_questions_job_idx').on(table.job_id),
}));

export const screening_questions_relations = relations(screening_questions, ({ one, many }) => ({
    job: one(job_listings, {
        fields: [screening_questions.job_id],
        references: [job_listings.id],
    }),
    answers: many(screening_answers),
}));

export const screening_answers = mysqlTable('screening_answers', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    // SET NULL on question delete — the snapshot columns below keep the
    // answer readable; deleting a question must never delete answers.
    question_id: int('question_id').references(() => screening_questions.id, { onDelete: 'set null' }),
    // Snapshot of the question text/type/order at answer time.
    question_text: text('question_text').notNull(),
    question_type: varchar('question_type', { length: 32 }).notNull(),
    sort_order: int('sort_order').notNull().default(0),
    answer_text: text('answer_text').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    application_idx: index('screening_answers_application_idx').on(table.application_id),
}));

export const screening_answers_relations = relations(screening_answers, ({ one }) => ({
    application: one(applications, {
        fields: [screening_answers.application_id],
        references: [applications.id],
    }),
    question: one(screening_questions, {
        fields: [screening_answers.question_id],
        references: [screening_questions.id],
    }),
}));

export const interviews = mysqlTable(
    'interviews',
    {
        id: int('id').primaryKey().autoincrement(),
        applications_id: int().references(() => applications.id, { onDelete: 'cascade' }),
        locations: varchar({ length: 255 }).notNull(),
        start_at: timestamp('start_at'),
        end_at: timestamp('end_at'),
        type: mysqlEnum('type', ['VIDEO', 'PHONE', 'ONSITE']),
        organization: varchar({ length: 255 }).notNull(),
        link: varchar({ length: 255 }),
        status: mysqlEnum('status', ['SCHEDULE', 'AWAITING_FEEDBACK', 'COMPLETE', 'HOLD_PENDING', 'CANCELLED']).default('SCHEDULE'),
        // Smart Interview Holds
        hold_token: varchar('hold_token', { length: 64 }),
        hold_status: mysqlEnum('hold_status', [
            'NONE',
            'TENTATIVE',
            'CONFIRMED',
            'DECLINED',
            'EXPIRED',
            'RELEASED',
        ]).default('NONE'),
        hold_expires_at: timestamp('hold_expires_at'),
        hold_email_sent_at: timestamp('hold_email_sent_at'),
        // D6: reminder emails — set when the 24h reminder sweep sends.
        reminder_sent_at: timestamp('reminder_sent_at'),
        // D1: reason recorded when a scheduled interview is cancelled.
        cancel_reason: varchar('cancel_reason', { length: 255 }),
        calendar_event_id: varchar('calendar_event_id', { length: 255 }),
        calendar_owner_id: varchar('calendar_owner_id', { length: 255 }),
        // Calendly scheduling (migration 0015): which provider booked this
        // interview. 'google' is the default for every pre-Calendly row.
        // calendar_event_id / calendar_owner_id are Google-typed and are
        // NOT overloaded for Calendly — Calendly identifiers live in
        // their own columns below.
        scheduling_provider: mysqlEnum('scheduling_provider', ['google', 'calendly', 'zoom']).notNull().default('google'),
        calendly_event_type_uri: varchar('calendly_event_type_uri', { length: 255 }),
        // Display name of the event type, stored at booking time so the
        // card can show it without a live Calendly API call.
        calendly_event_type_name: varchar('calendly_event_type_name', { length: 255 }),
        calendly_event_uri: varchar('calendly_event_uri', { length: 255 }),
        calendly_invitee_uri: varchar('calendly_invitee_uri', { length: 255 }),
        // Zoom scheduling (migration 0018): the Zoom meeting id for this
        // interview, stored at booking time so cancel/reschedule can
        // address the meeting without a live lookup. Stored as a STRING:
        // Zoom meeting ids can exceed 10 digits, so an int column would
        // overflow. The join URL lives in `link` (its exact meaning) —
        // no separate join-url column.
        zoom_meeting_id: varchar('zoom_meeting_id', { length: 64 }),
        interviewer_ids: json('interviewer_ids').$type<string[]>().default([]),
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    },
    (table) => ({
        hold_token_idx: unique('interviews_hold_token_uid').on(table.hold_token),
        org_idx: index('interviews_org_idx').on(table.organization),
        hold_expiry_idx: index('interviews_hold_expiry_idx').on(table.hold_status, table.hold_expires_at),
        application_idx: index('interviews_application_idx').on(table.applications_id),
    })
);

export const interviews_relations = relations(interviews, ({ one }) => ({
    score: one(score_cards),
    application: one(applications, {
        fields: [interviews.applications_id],
        references: [applications.id],
    }),
}));

export const score_cards = mysqlTable('score_cards', {
    id: int('id').primaryKey().autoincrement(),
    interviews_id: int().references(() => interviews.id, { onDelete: 'cascade' }),
    interviewer: varchar({ length: 255 }).notNull(),
    decision: mysqlEnum('decision', ["ADVANCE IMMEDIATELY", "REJECT IMMEDIATELY", "NO_DECISION"]).default("NO_DECISION"),
    overall_recommendations: mysqlEnum('overall_recommendations', ["DEFINITELY_NO", "NO", "YES", "STRONG_YES", "NO_DECISION"]).default("NO_DECISION"),
    // Written feedback from the interviewer (D3: the column the review page
    // used to render never existed). Nullable so legacy rows stay valid.
    feedback: text('feedback'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // One scorecard per interview (interviews.score is a `one` relation).
    interview_unique: uniqueIndex('score_cards_interview_unique').on(table.interviews_id),
}));

export const score_cards_relations = relations(score_cards, ({ one }) => ({
    interviews: one(interviews, {
        fields: [score_cards.interviews_id],
        references: [interviews.id],
    }),
}));

export const scoresCards = score_cards;
export const scoresCards_relation = score_cards_relations;

// ── Claude interview prep (anthropic-screening plugin) ────────────────────
// One row per generation, not one per application: "Regenerate" appends a
// new row and the application page renders the latest, so earlier output
// is never silently overwritten. No existing table fits — `applications`
// resume_score_* columns are scoring output (0–100 + summary), `score_cards`
// is per-interview human feedback with a fixed schema, and internal notes
// are free-text. Questions + insights are structured JSON with a stage
// snapshot and the model that produced them, so they need their own table.
// `stage_name` is a snapshot of the application's stage at generation
// time: the card warns when the candidate has since moved stage, instead
// of presenting stale prep as current.
export const interview_prep = mysqlTable('interview_prep', {
    id: int('id').primaryKey().autoincrement(),
    application_id: int('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    organization: varchar({ length: 255 }).notNull(),
    // Snapshot of the application's stage (JOB_STAGES name) when generated.
    stage_name: varchar('stage_name', { length: 64 }),
    // Model id actually called, e.g. claude-sonnet-4-5-20250929.
    model: varchar({ length: 255 }).notNull(),
    // [{ category, question, rationale }] — validated by zod at generation.
    questions: json('questions').$type<{ category: string; question: string; rationale: string }[]>().notNull(),
    // { summary, strengths, risks, focusAreas } — validated by zod.
    insights: json('insights').$type<{ summary: string; strengths: string[]; risks: string[]; focusAreas: string[] }>().notNull(),
    generated_at: timestamp('generated_at').defaultNow().notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    application_idx: index('interview_prep_application_idx').on(table.application_id),
    org_idx: index('interview_prep_org_idx').on(table.organization),
}));

export const interview_prep_relations = relations(interview_prep, ({ one }) => ({
    application: one(applications, {
        fields: [interview_prep.application_id],
        references: [applications.id],
    }),
}));

// ── Activity / audit log ──────────────────────────────────────────────────
// Append-only record of who did what, for the org's Activity feed. The
// actor name is denormalized at write time (users_table rows may not exist
// for every Clerk user, and the entry must stay readable if the user is
// later removed). entity_id deliberately has NO foreign key: the log must
// survive the entity being deleted — the feed checks at read time whether
// the entity still exists before linking to it.
export const activity_log = mysqlTable('activity_log', {
    id: int('id').primaryKey().autoincrement(),
    organization_id: varchar('organization_id', { length: 255 })
        .notNull()
        .references(() => organization.clerk_id, { onDelete: 'cascade' }),
    actor_id: varchar('actor_id', { length: 255 }).notNull(),
    actor_name: varchar('actor_name', { length: 255 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    entity_type: mysqlEnum('entity_type', ['job', 'candidate', 'application', 'interview', 'plugin']).notNull(),
    entity_id: int('entity_id').notNull(),
    summary: varchar('summary', { length: 512 }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // The feed reads one org's entries newest first.
    org_created_idx: index('activity_log_org_created_idx').on(table.organization_id, table.created_at),
}));

export const activity_log_relations = relations(activity_log, ({ one }) => ({
    organization: one(organization, {
        fields: [activity_log.organization_id],
        references: [organization.clerk_id],
    }),
}));

// Generated reports, one row per generation. The file itself is NOT stored:
// downloads recompute the report from the stored type + date range, so a
// history row can never go stale and there is no blob to orphan. No
// retention/archival policy yet — rows are small (no payload, just params).
export const report_history = mysqlTable('report_history', {
    id: int('id').primaryKey().autoincrement(),
    organization: varchar('organization', { length: 255 })
        .notNull()
        .references(() => organization.clerk_id, { onDelete: 'cascade' }),
    report_type: varchar('report_type', { length: 100 }).notNull(),
    date_from: timestamp('date_from').notNull(),
    date_to: timestamp('date_to').notNull(),
    // JSON array of the metric ids the user selected in the generator, or
    // NULL when the user left every metric selected (full report).
    metrics: text('metrics'),
    generated_by: varchar('generated_by', { length: 255 }).notNull(),
    generated_by_name: varchar('generated_by_name', { length: 255 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // History reads one org's entries newest first.
    org_created_idx: index('report_history_org_created_idx').on(table.organization, table.created_at),
}));

export const report_history_relations = relations(report_history, ({ one }) => ({
    organization: one(organization, {
        fields: [report_history.organization],
        references: [organization.clerk_id],
    }),
}));

// ── Outbound webhooks (migration 0021, feat/plugin-webhooks) ─────────────────
// Org-level Zapier-style subscriptions. This is org infrastructure, NOT a
// plugin-manifest provider: there is no third-party credential to configure
// and no provider factory — subscriptions are destination URLs + an event
// filter, signed with a per-subscription HMAC secret.
//
// `signing_secret` holds the AES-256-GCM ciphertext (`enc:v1:…`, see
// src/lib/plugin-encryption.ts) — the plaintext is generated server-side
// at creation, shown ONCE in the create response, and never stored or
// returned again. `events` is the JSON array of subscribed
// WebhookEventType values (see src/lib/webhooks/events.ts).
export const webhook_subscriptions = mysqlTable('webhook_subscriptions', {
    id: int('id').primaryKey().autoincrement(),
    organization: varchar('organization', { length: 255 })
        .notNull()
        .references(() => organization.clerk_id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 2048 }).notNull(),
    events: json('events').$type<string[]>().notNull(),
    // AES-256-GCM ciphertext of the HMAC signing secret. Never plaintext.
    signing_secret: text('signing_secret').notNull(),
    active: boolean('active').notNull().default(true),
    created_by: varchar('created_by', { length: 255 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    // Subscription management reads one org's subscriptions; the delivery
    // worker loads one org's active subscriptions per event.
    org_active_idx: index('webhook_subscriptions_org_active_idx').on(table.organization, table.active),
}));

export const webhook_subscriptions_relations = relations(webhook_subscriptions, ({ one, many }) => ({
    organization: one(organization, {
        fields: [webhook_subscriptions.organization],
        references: [organization.clerk_id],
    }),
    deliveries: many(webhook_deliveries),
}));

// One row per delivery ATTEMPT (not per delivery): BullMQ retries a failed
// POST up to 3×, and every attempt is visible — a failed delivery is never
// silently swallowed. `delivery_id` groups the attempts of one logical
// delivery (it is also sent as the X-Applico-Delivery-Id header so a
// receiver can dedupe an at-least-once redelivery). `status` is
// 'delivered' (2xx), 'failed' (non-2xx response) or 'error' (no response:
// timeout / DNS / connection failure). `response_snippet` is the first
// 500 chars of the response body — never the request body (it could
// contain candidate PII beyond what the log needs) and never a secret.
export const webhook_deliveries = mysqlTable('webhook_deliveries', {
    id: int('id').primaryKey().autoincrement(),
    delivery_id: varchar('delivery_id', { length: 36 }).notNull(),
    subscription_id: int('subscription_id')
        .notNull()
        .references(() => webhook_subscriptions.id, { onDelete: 'cascade' }),
    organization: varchar('organization', { length: 255 })
        .notNull()
        .references(() => organization.clerk_id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 64 }).notNull(),
    // The per-occurrence id of the event (payload.event_id), so a delivery
    // can be traced back to the exact application/interview event.
    event_id: varchar('event_id', { length: 36 }).notNull(),
    attempt: int('attempt').notNull().default(1),
    status: mysqlEnum('status', ['delivered', 'failed', 'error']).notNull(),
    status_code: int('status_code'),
    response_snippet: text('response_snippet'),
    error_message: varchar('error_message', { length: 512 }),
    duration_ms: int('duration_ms'),
    created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // The delivery log reads one org's attempts newest first; per-
    // subscription filtering is the same query with subscription_id.
    org_created_idx: index('webhook_deliveries_org_created_idx').on(table.organization, table.created_at),
    subscription_created_idx: index('webhook_deliveries_subscription_created_idx').on(table.subscription_id, table.created_at),
    delivery_idx: index('webhook_deliveries_delivery_idx').on(table.delivery_id),
}));

export const webhook_deliveries_relations = relations(webhook_deliveries, ({ one }) => ({
    subscription: one(webhook_subscriptions, {
        fields: [webhook_deliveries.subscription_id],
        references: [webhook_subscriptions.id],
    }),
    organization: one(organization, {
        fields: [webhook_deliveries.organization],
        references: [organization.clerk_id],
    }),
}));
