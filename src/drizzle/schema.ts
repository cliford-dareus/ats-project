import {int, mysqlTable, varchar, mysqlEnum, timestamp} from 'drizzle-orm/mysql-core';
import {relations} from "drizzle-orm";

export const usersTable = mysqlTable('users_table', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    age: int().notNull(),
    email: varchar({length: 255}).notNull().unique(),
});

export const usersTableRelations = relations(usersTable, ({many}) => ({
    assignments: many(stages)
}))

export const job_listings = mysqlTable('job_listing', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    location: varchar({length: 255}).notNull(),
    description: varchar({length: 255}).notNull(),
    salary_up_to: varchar({length: 255}).notNull(),
    // department: varchar({length: 255}).notNull(),
    // status: mysqlEnum('status', ['Not Publish', 'Publish', 'Archive']).default('Not Publish'),
    createdBy: varchar('created_by',{length: 255}).references(() => usersTable.id).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const job_listingsRelations = relations(job_listings, ({many}) => ({
    stages: many(stages),
    candidates: many(candidates),
    job_to_technologies: many(job_technologies),
}))

export const technologies = mysqlTable('technologies', {
    id: int('id').primaryKey().autoincrement(),
    name: varchar({length: 255}).notNull(),
    years_experience: int(),
})

export const technologiesRelations = relations(technologies, ({many}) => ({
    job_to_technologies: many(job_technologies),
}))

export const job_technologies = mysqlTable('job_technologies', {
    id: int().primaryKey().autoincrement(),
    job_id: int().notNull().references(() => job_listings.id),
    technology_id: int().notNull().references(() => technologies.id),
})

export const jobTechnologyRelation = relations(job_technologies, ({one}) => ({
    job_id: one(job_listings, {
        fields: [job_technologies.job_id],
        references: [job_listings.id]
    }),
    technology_id: one(technologies, {
        fields: [job_technologies.technology_id],
        references: [technologies.id]
    }),
}))

export const stages = mysqlTable('stages', {
    id: int('id').primaryKey().autoincrement(),
    job_id: int().notNull(),
    stage_name: mysqlEnum('stage_name', ['New Candidate', 'Screening', 'Phone Interview', 'Offer']),
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
    job_id: int(),
    current_stage_id: int(),
    name: varchar({length: 255}).notNull(),
    email: varchar({length: 255}).notNull().unique(),
    cv_path: varchar({length: 255}).notNull(),
    phone: varchar({length: 255}).notNull().unique(),
    status: mysqlEnum('status', ['Active', 'Rejected', 'Hired']).default('Active'),
});

export const candidates_relations = relations(candidates, ({one}) => ({
    job_id: one(job_listings, {
        fields: [candidates.job_id],
        references: [job_listings.id]
    }),
    stage_id: one(stages, {
        fields: [candidates.current_stage_id],
        references: [stages.id]
    })
}))

export type JobListingType = typeof job_listings.$inferInsert


