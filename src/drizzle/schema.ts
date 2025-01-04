import {int, mysqlTable, varchar, mysqlEnum, timestamp} from 'drizzle-orm/mysql-core';
import {relations} from "drizzle-orm";

export const usersTable = mysqlTable('users_table', {
    id: varchar({length: 255}).primaryKey(),
    name: varchar({length: 255}).notNull(),
    age: int().notNull(),
    email: varchar({length: 255}).notNull().unique(),
});

export const usersTableRelations = relations(usersTable, ({many}) => ({
    assignments: many(stages),
}))

export const job_listings = mysqlTable('job_listing', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    location: varchar({length: 255}).notNull(),
    description: varchar({length: 255}).notNull(),
    salary_up_to: varchar({length: 255}).notNull(),
    // department: varchar({length: 255}).notNull(),
    status: mysqlEnum('status', ['Not Publish', 'Actively Hiring', 'Archive']).default('Not Publish'),
    createdBy: varchar('created_by', {length: 255}).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const job_listingsRelations = relations(job_listings, ({many}) => ({
    stages: many(stages),
    candidates: many(candidates),
    job_to_technologies: many(job_technologies),
}));

export const technologies = mysqlTable('technologies', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    years_experience: int(),
});

export const technologiesRelations = relations(technologies, ({many}) => ({
    job_to_technologies: many(job_technologies),
}));

export const job_technologies = mysqlTable('job_technologies', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().notNull().references(() => job_listings.id, {onDelete: 'cascade'}),
    technology_id: int().notNull().references(() => technologies.id, {onDelete: 'cascade'}),
});

export const jobTechnologyRelation = relations(job_technologies, ({one}) => ({
    job_id: one(job_listings, {
        fields: [job_technologies.job_id],
        references: [job_listings.id]
    }),
    technology_id: one(technologies, {
        fields: [job_technologies.technology_id],
        references: [technologies.id]
    }),
}));

export const stages = mysqlTable('stages', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().notNull().references(() => job_listings.id, {onDelete: 'cascade'}),
    stage_name: mysqlEnum('stage_name', ['New Candidate', 'Screening', 'Phone Interview', 'Interview','Offer']),
    stage_order_id: int().notNull(),
    assign_to: varchar({length: 255}),
});

export const stagesRelations = relations(stages, ({one}) => ({
    jobId: one(job_listings, {
        fields: [stages.job_id],
        references: [job_listings.id],
    }),
    // candidates_order_id: many(candidates)
    assign_to: one(usersTable, {
        fields: [stages.assign_to],
        references: [usersTable.id]
    })
}));

export const candidates = mysqlTable('candidate', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    email: varchar({length: 255}).notNull().unique(),
    phone: varchar({length: 255}).notNull().unique(),
    cv_path: varchar({length: 255}).notNull().unique(),
    // location: varchar({length: 255}).notNull().unique(),
    status: mysqlEnum('status', ['Active', 'Rejected', 'Hired']).default('Active'),
});

export const candidates_relations = relations(candidates, ({one, many}) => ({
    applications: many(applications),
    attachments: one(attachments),
}));

export const attachments = mysqlTable('attachments', {
    id: int('id').primaryKey().autoincrement(),
    file_name: varchar({length: 255}).notNull(),
    file_url: varchar({length: 255}).notNull(),
    candidate_id: int().notNull().references(() => candidates.id, {onDelete: 'cascade'}),
    attachment_type: mysqlEnum('attachment_type', ['RESUME', 'COVER_LETTER', 'OFFER_LETTER', "OTHER"])
});

export const attachments_relations = relations(attachments, ({one}) => ({
    candidates_id: one(candidates, {fields: [attachments.candidate_id], references: [candidates.id]}),
}));

export const applications = mysqlTable('applications', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().references(() => job_listings.id),
    current_stage_id: int(),
    candidate: int().references(() => candidates.id, {onDelete: 'cascade'}),
});

export const applications_relations = relations(applications, ({one}) => ({
    interviews: one(interviews),
    score: one(scoreCards),
    candidates: one(candidates, {fields: [applications.candidate], references: [candidates.id]}),
    job: one(job_listings, {fields: [applications.job_id], references: [job_listings.id]}),
}))

export const interviews = mysqlTable('interviews', {
    id: int('id').primaryKey().autoincrement(),
    applications_id: int().references(() => applications.id, {onDelete: 'cascade'}),
    locations: varchar({length: 255}).notNull(),
    start_at: timestamp('start_at'),
    end_at: timestamp('end_at'),
    status: mysqlEnum('status', ['SCHEDULE', 'AWAITING_FEEDBACK', 'COMPLETE']),
});

export const interviews_relations = relations(interviews, ({one}) => ({
    score: one(scoreCards),
    application: one(applications, {fields: [interviews.applications_id], references: [applications.id]})
}));

export const scoreCards = mysqlTable('scoresCards', {
    id: int('id').primaryKey().autoincrement(),
    applications_id: int().references(() => applications.id),
    interviews_id: int().references(() => interviews.id, {onDelete: 'cascade'}),
    interviewer: varchar({length: 255}).notNull(),
    overall_recommendations: mysqlEnum('overall_recommendations', ["DEFINITELY_NO", "NO", "YES", "STRONG_YES", "NO_DECISION"]).default("NO_DECISION")
});

export const scoresCards_relation = relations(scoreCards, ({one}) => ({
    interviews: one(interviews, {fields: [scoreCards.interviews_id], references: [interviews.id]}),
    applications: one(applications, {fields: [scoreCards.applications_id], references: [applications.id]}),
}));

export type JobListingType = typeof job_listings.$inferInsert


