'use server';

import { db } from "@/drizzle/db";
import { applications, job_listings, screening_answers, screening_questions } from "@/drizzle/schema";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { canEditJob, canViewApplication, canViewJob } from "@/server/permissions";
import {
    screeningQuestionInputSchema,
    type ScreeningQuestionType,
} from "@/zod";

// ── Screening questions & answers — server actions ────────────────────────
// Backend contract for the screening-questions feature (UI agent: see the
// return shapes below; no UI lives in this file).
//
// Tenant rule (same as every other job action): the org ALWAYS comes from
// the Clerk auth() session — never from a client-supplied orgId. A job id
// alone never returns another org's rows: each action first resolves the
// job/application row scoped to the session org (and, for jobs, excludes
// trashed rows via deleted_at IS NULL).
//
// Error shape (dashboard actions): { error: true, message: string }.
// Success shape (mutations): { success: true, ... }.
// The public action returns an array on success and
// { success: false, message: string } on failure — callers must check
// Array.isArray() first (an array has no `success` field).

// ── Shared shapes ─────────────────────────────────────────────────────────

export type ScreeningQuestionDTO = {
    id: number;
    jobId: number;
    questionText: string;
    type: ScreeningQuestionType;
    options: string[] | null;
    isRequired: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

/** Public apply-form shape: only what an applicant needs to answer. */
export type PublicScreeningQuestionDTO = {
    id: number;
    questionText: string;
    type: ScreeningQuestionType;
    options: string[] | null;
    isRequired: boolean;
    sortOrder: number;
};

export type ScreeningAnswerDTO = {
    id: number;
    applicationId: number;
    /** NULL when the question was deleted after the answer was given. */
    questionId: number | null;
    questionText: string;
    questionType: string;
    sortOrder: number;
    answer: string;
    createdAt: Date;
};

const toQuestionDTO = (row: typeof screening_questions.$inferSelect): ScreeningQuestionDTO => ({
    id: row.id,
    jobId: row.job_id,
    questionText: row.question_text,
    type: row.type,
    options: row.options,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const toPublicQuestionDTO = (row: typeof screening_questions.$inferSelect): PublicScreeningQuestionDTO => ({
    id: row.id,
    questionText: row.question_text,
    type: row.type,
    options: row.options,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
});

const toAnswerDTO = (row: typeof screening_answers.$inferSelect): ScreeningAnswerDTO => ({
    id: row.id,
    applicationId: row.application_id,
    questionId: row.question_id,
    questionText: row.question_text,
    questionType: row.question_type,
    sortOrder: row.sort_order,
    answer: row.answer_text,
    createdAt: row.created_at,
});

/** Resolve a job row scoped to the session org; trashed jobs read as not found. */
const get_job_for_org = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select({ id: job_listings.id, organization: job_listings.organization })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .limit(1);
    return job ?? null;
};

// ── Dashboard: manage questions for a job ──────────────────────────────────

/** All questions for a job, ordered by sort_order then id. job:view-gated. */
export const get_screening_questions_for_job_action = async (jobId: number) => {
    const { userId, orgId } = await auth();
    const parsed = await z.number().int().positive().spa(jobId);
    const allowed = await canViewJob();

    if (!userId || !orgId || !allowed || !parsed.success) {
        return { error: true, message: "There was an error retrieving screening questions" };
    }

    const job = await get_job_for_org(parsed.data, orgId);
    if (!job) {
        return { error: true, message: "Job not found" };
    }

    const rows = await db
        .select()
        .from(screening_questions)
        .where(eq(screening_questions.job_id, parsed.data))
        .orderBy(asc(screening_questions.sort_order), asc(screening_questions.id));

    return rows.map(toQuestionDTO);
};

/** Add a question to a job. job:edit-gated. Appends at the end unless sortOrder is given. */
export const create_screening_question_action = async (
    jobId: number,
    unsafeInput: z.infer<typeof screeningQuestionInputSchema>,
) => {
    const { userId, orgId } = await auth();
    const parsedJob = await z.number().int().positive().spa(jobId);
    const parsed = await screeningQuestionInputSchema.spa(unsafeInput);
    const allowed = await canEditJob();

    if (!userId || !orgId || !allowed || !parsedJob.success || !parsed.success) {
        return { error: true, message: "There was an error creating the screening question" };
    }

    const job = await get_job_for_org(parsedJob.data, orgId);
    if (!job) {
        return { error: true, message: "Job not found" };
    }

    const sortOrder =
        parsed.data.sortOrder ??
        (await db
            .select({ value: max(screening_questions.sort_order) })
            .from(screening_questions)
            .where(eq(screening_questions.job_id, parsedJob.data))
            .then((rows) => (rows[0]?.value ?? -1) + 1));

    const [inserted] = await db
        .insert(screening_questions)
        .values({
            job_id: parsedJob.data,
            question_text: parsed.data.questionText,
            type: parsed.data.type,
            options: parsed.data.type === "single_choice" ? parsed.data.options ?? null : null,
            is_required: parsed.data.isRequired,
            sort_order: sortOrder,
        })
        .$returningId();

    const [row] = await db
        .select()
        .from(screening_questions)
        .where(eq(screening_questions.id, inserted.id))
        .limit(1);

    return { success: true as const, question: toQuestionDTO(row) };
};

/** Update a question (text, type, options, required flag, order). job:edit-gated. */
export const update_screening_question_action = async (
    questionId: number,
    unsafeInput: z.infer<typeof screeningQuestionInputSchema>,
) => {
    const { userId, orgId } = await auth();
    const parsedId = await z.number().int().positive().spa(questionId);
    const parsed = await screeningQuestionInputSchema.spa(unsafeInput);
    const allowed = await canEditJob();

    if (!userId || !orgId || !allowed || !parsedId.success || !parsed.success) {
        return { error: true, message: "There was an error updating the screening question" };
    }

    // Org-scope through the question's job row — the question id alone
    // must never update another org's question.
    const [existing] = await db
        .select({ id: screening_questions.id, job_id: screening_questions.job_id, sort_order: screening_questions.sort_order })
        .from(screening_questions)
        .innerJoin(job_listings, eq(job_listings.id, screening_questions.job_id))
        .where(
            and(
                eq(screening_questions.id, parsedId.data),
                eq(job_listings.organization, orgId),
                isNull(job_listings.deleted_at),
            ),
        )
        .limit(1);
    if (!existing) {
        return { error: true, message: "Question not found" };
    }

    await db
        .update(screening_questions)
        .set({
            question_text: parsed.data.questionText,
            type: parsed.data.type,
            options: parsed.data.type === "single_choice" ? parsed.data.options ?? null : null,
            is_required: parsed.data.isRequired,
            ...(parsed.data.sortOrder !== undefined ? { sort_order: parsed.data.sortOrder } : {}),
        })
        .where(eq(screening_questions.id, parsedId.data));

    const [row] = await db
        .select()
        .from(screening_questions)
        .where(eq(screening_questions.id, parsedId.data))
        .limit(1);

    return { success: true as const, question: toQuestionDTO(row) };
};

/**
 * Delete a question. job:edit-gated. Allowed always: answers survive —
 * screening_answers.question_id is ON DELETE SET NULL and the answer rows
 * keep their question_text / question_type / sort_order snapshots, so the
 * application detail page keeps rendering them.
 */
export const delete_screening_question_action = async (questionId: number) => {
    const { userId, orgId } = await auth();
    const parsed = await z.number().int().positive().spa(questionId);
    const allowed = await canEditJob();

    if (!userId || !orgId || !allowed || !parsed.success) {
        return { error: true, message: "There was an error deleting the screening question" };
    }

    // Org-scope through the question's job row (see update above).
    const [existing] = await db
        .select({ id: screening_questions.id })
        .from(screening_questions)
        .innerJoin(job_listings, eq(job_listings.id, screening_questions.job_id))
        .where(
            and(
                eq(screening_questions.id, parsed.data),
                eq(job_listings.organization, orgId),
                isNull(job_listings.deleted_at),
            ),
        )
        .limit(1);
    if (!existing) {
        return { error: true, message: "Question not found" };
    }

    await db.delete(screening_questions).where(eq(screening_questions.id, parsed.data));

    return { success: true as const, message: "Screening question deleted" };
};

/**
 * Reorder a job's questions. job:edit-gated. `orderedIds` must contain
 * exactly the job's question ids, in the new order — no extras, no
 * missing ids, no duplicates. Updates run in one transaction (same
 * db.transaction pattern as move_application_and_reorder_db).
 */
export const reorder_screening_questions_action = async (jobId: number, orderedIds: number[]) => {
    const { userId, orgId } = await auth();
    const parsedJob = await z.number().int().positive().spa(jobId);
    const parsed = await z.array(z.number().int().positive()).spa(orderedIds);
    const allowed = await canEditJob();

    if (!userId || !orgId || !allowed || !parsedJob.success || !parsed.success) {
        return { error: true, message: "There was an error reordering screening questions" };
    }

    const job = await get_job_for_org(parsedJob.data, orgId);
    if (!job) {
        return { error: true, message: "Job not found" };
    }

    const rows = await db
        .select({ id: screening_questions.id })
        .from(screening_questions)
        .where(eq(screening_questions.job_id, parsedJob.data));
    const existingIds = rows.map((row) => row.id).sort((a, b) => a - b);
    const givenIds = [...parsed.data].sort((a, b) => a - b);
    const sameSet =
        existingIds.length === givenIds.length &&
        existingIds.every((id, i) => id === givenIds[i]) &&
        new Set(parsed.data).size === parsed.data.length;
    if (!sameSet) {
        return { error: true, message: "Reorder list must contain exactly this job's questions" };
    }

    await db.transaction(async (tx) => {
        for (let i = 0; i < parsed.data.length; i++) {
            await tx
                .update(screening_questions)
                .set({ sort_order: i })
                .where(
                    and(
                        eq(screening_questions.id, parsed.data[i]),
                        eq(screening_questions.job_id, parsedJob.data),
                    ),
                );
        }
    });

    return { success: true as const };
};

// ── Public: questions for the apply form ────────────────────────────────────

/**
 * PUBLIC (no auth): questions for a job's apply form. Mirrors the guard in
 * create_application — the job must exist, be OPEN, and not be trashed
 * (deleted_at NULL). Returns only the fields an applicant needs, ordered
 * by sort_order then id. Array on success; { success: false, message }
 * on failure (callers must check Array.isArray first).
 */
export const get_public_screening_questions_action = async (jobId: number) => {
    const parsed = await z.number().int().positive().spa(jobId);
    if (!parsed.success) {
        return { success: false as const, message: "Job not found" };
    }

    const [job] = await db
        .select({ id: job_listings.id, status: job_listings.status })
        .from(job_listings)
        .where(and(eq(job_listings.id, parsed.data), isNull(job_listings.deleted_at)))
        .limit(1);
    if (!job || job.status !== "OPEN") {
        return { success: false as const, message: "This job is no longer accepting applications" };
    }

    const rows = await db
        .select()
        .from(screening_questions)
        .where(eq(screening_questions.job_id, parsed.data))
        .orderBy(asc(screening_questions.sort_order), asc(screening_questions.id));

    return rows.map(toPublicQuestionDTO);
};

// ── Dashboard: answers for an application ──────────────────────────────────

/**
 * Answers for one application, in the order the questions were in when
 * answered (screening_answers.sort_order is snapshotted at insert time,
 * so deleting or reordering a question later cannot scramble the render
 * order; answers whose question was deleted keep rendering from their
 * snapshot columns). application:view-gated — same permission the
 * application detail page uses (get_application_by_id_action). Trashed
 * applications read as not found.
 */
export const get_screening_answers_for_application_action = async (applicationId: number) => {
    const { userId, orgId } = await auth();
    const parsed = await z.number().int().positive().spa(applicationId);
    const allowed = await canViewApplication();

    if (!userId || !orgId || !allowed || !parsed.success) {
        return { error: true, message: "There was an error retrieving screening answers" };
    }

    const [application] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, parsed.data), eq(applications.organization, orgId), isNull(applications.deleted_at)))
        .limit(1);
    if (!application) {
        return { error: true, message: "Application not found" };
    }

    const rows = await db
        .select()
        .from(screening_answers)
        .where(eq(screening_answers.application_id, parsed.data))
        .orderBy(asc(screening_answers.sort_order), asc(screening_answers.id));

    return rows.map(toAnswerDTO);
};

// NOTE: validateScreeningAnswers is intentionally NOT re-exported here —
// a 'use server' file may only export async functions. Callers import it
// directly from "@/lib/screening" (and screeningAnswerInputSchema from
// "@/zod"). Server-side validation still runs in create_application;
// never trust client validation alone.
