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
    departments: one(departments, {
        fields: [job_listings.department],
        references: [departments.id],
    }),
    organization: one(organization, {
        fields: [job_listings.organization],
        references: [organization.clerk_id],
    }),
    automation: many(automation_rules),
}));

export const job_listingsRelations = job_listings_relations;

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

export const applications_relations = relations(applications, ({ one, many }) => ({
    interviews: many(interviews),
    score: many(score_cards),
    candidates: one(candidates, { fields: [applications.candidate], references: [candidates.id] }),
    job: one(job_listings, { fields: [applications.job_id], references: [job_listings.id] }),
    stage: one(stages, {
        fields: [applications.current_stage_id],
        references: [stages.id],
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
    entity_type: mysqlEnum('entity_type', ['job', 'candidate', 'application', 'interview']).notNull(),
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
