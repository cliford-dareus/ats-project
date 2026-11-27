'use server';

import {
    create_application, create_application_for_candidate_db, get_all_applications,
    get_application_by_id, get_application_stage, get_job_all_applications,
    delete_application_db,
    move_application_and_reorder_db,
    update_application,
    update_application_stage
} from "@/server/queries";
import { auth } from "@clerk/nextjs/server";
import { canDeleteApplication, canEditApplication, canMoveApplication, canViewApplication, requirePermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import { z } from "zod";
import { applicationFormSchema, filterApplicationsSchema, moveAndReorderApplicationSchema, screeningAnswerInputSchema, updateApplicationSchema, updateApplicationStageSchema } from "@/zod";
import { db } from "@/drizzle/db";
import { applications, candidates, stages } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

/** Candidate + target-stage display names for a stage-move log entry. */
const get_stage_move_context = async (applicationId: number, stageId: number, orgId: string) => {
    const [application] = await db
        .select({ candidateName: candidates.name })
        .from(applications)
        .innerJoin(candidates, eq(candidates.id, applications.candidate))
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)))
        .limit(1);
    const [stage] = await db
        .select({ stageName: stages.stage_name })
        .from(stages)
        .where(eq(stages.id, stageId))
        .limit(1);
    if (!application || !stage) return null;
    return { candidateName: application.candidateName, stageName: stage.stageName };
};

const record_stage_move = async (applicationId: number, stageId: number, orgId: string) => {
    const ctx = await get_stage_move_context(applicationId, stageId, orgId);
    await record_activity({
        action: "application.stage_moved",
        entity_type: "application",
        entity_id: applicationId,
        summary: ctx
            ? `Moved ${ctx.candidateName}'s application to ${ctx.stageName}`
            : "Moved application to a new stage",
    });
};

// NOTE: intentionally NOT permission-gated — this is the public apply
// path (src/app/(public)/[domain]/_components/apply-form.tsx), called by
// unauthenticated applicants. The dashboard "Add Applicant" modal uses
// create_application_for_candidate_action instead (session-gated).
// Do not add a session permission check here without splitting the two flows.
export const create_application_action = async (
    unsafeData: z.infer<typeof applicationFormSchema>,
    // Optional screening answers from the apply form:
    // [{ questionId: number, answer: string }]. Shape-checked here with
    // screeningAnswerInputSchema; per-type rules + required questions are
    // enforced server-side in create_application (validateScreeningAnswers)
    // and failures come back as { success: false, message } for the form
    // to show inline. Existing callers passing one argument are unaffected.
    screeningAnswers?: Array<{ questionId: number; answer: string }>,
) => {
    const { success, data } = await applicationFormSchema.spa(unsafeData);

    if (!success) {
        throw new Error("There was an error");
    }

    let validatedAnswers: Array<{ questionId: number; answer: string }> | undefined;
    if (screeningAnswers !== undefined) {
        const parsedAnswers = await z.array(screeningAnswerInputSchema).spa(screeningAnswers);
        if (!parsedAnswers.success) {
            return { success: false as const, message: "Invalid screening answers" };
        }
        validatedAnswers = parsedAnswers.data;
    }

    return await create_application(data, validatedAnswers);
};

// Dashboard-only quick-add: application for an existing candidate.
// Session-gated (application:create) — unlike create_application_action,
// which also serves the public apply form.
export const create_application_for_candidate_action = async (unsafeData: { jobId: number; candidateId: number }) => {
    const { userId, orgId } = await auth();
    const parsed = await z.object({
        jobId: z.number().int().positive(),
        candidateId: z.number().int().positive(),
    }).spa(unsafeData);

    if (!userId || !orgId || !parsed.success) {
        return { success: false as const, message: "Invalid application data" };
    }
    await requirePermission("application:create");

    return await create_application_for_candidate_db(parsed.data.jobId, parsed.data.candidateId, orgId);
};

export const update_application_action = async (unsafeData: z.infer<typeof updateApplicationSchema>) => {
    const { userId, orgId } = await auth();
    const { success, data } = await updateApplicationSchema.spa(unsafeData);
    const allowed = await canEditApplication();

    if (!success || !userId || !orgId || !allowed) {
        return { error: true, message: "There was an error updating your application" }
    }

    return await update_application(data, orgId);
};

export const update_application_stage_action = async (unsafeData: z.infer<typeof updateApplicationStageSchema>) => {
    const { userId, orgId } = await auth();
    const { success, data } = await updateApplicationStageSchema.spa(unsafeData);
    const allowed = await canMoveApplication();

    if (!userId || !orgId || !success || !allowed) {
        return { error: true, message: "There was an error updating application stage" }
    }

    const result = await update_application_stage(data, orgId);
    if (result && "success" in result && result.success) {
        await record_stage_move(data.applicationId, data.new_stage_id, orgId);
    }
    return result;
};

export const get_all_applications_action = async (unsafeData: z.infer<typeof filterApplicationsSchema>) => {
    const { userId, orgId } = await auth();
    const { success, data } = await filterApplicationsSchema.spa(unsafeData);
    const allowed = await canViewApplication();

    if (!userId || !orgId || !success || !allowed) {
        return { error: true, message: "There was an error retrieving applications" }
    }

    // Never trust a client-supplied organization filter — always the session org.
    return await get_all_applications({ ...data, organization: orgId });
};

export const get_application_by_id_action = async (applicationId: number) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewApplication();

    if (!userId || !orgId || !allowed) {
        return { error: true, message: "There was an error retrieving application" }
    }

    return await get_application_by_id(applicationId, orgId);
};

export const get_job_all_applications_action = async (jobId: number) => {
    const { userId, orgId } = await auth();
    const allowed = await canViewApplication();

    if (!userId || !orgId || !allowed) {
        return { error: true, message: "There was an error retrieving job applications" }
    }

    // Org-scoped (B20): the session org is passed down — a job id alone
    // must never return another org's applications.
    return await get_job_all_applications(jobId, orgId);
};

export const get_application_stage_counts_action = async () => {
    const { userId, orgId } = await auth();
    const allowed = await canViewApplication();

    if (!userId || !orgId || !allowed) {
        return { error: true, message: "There was an error retrieving application stage counts" }
    }

    return await get_application_stage(orgId);
};

export const moveApplicationAndReorder = async (unsafeData: z.infer<typeof moveAndReorderApplicationSchema>) => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return { success: false, error: "Unauthorized" };
    }

    const allowed = await canMoveApplication();
    if (!allowed) {
        return { success: false, error: "Missing permission: application:move" };
    }

    // S-3: the session org is asserted against the application inside the
    // transaction — a cross-org application id is rejected there.
    const result = await move_application_and_reorder_db(unsafeData, orgId);
    // A kanban drag within the same stage is a reorder, not a stage move —
    // only record when the stage actually changed.
    if (result.success && unsafeData.sourceStageId && unsafeData.sourceStageId !== unsafeData.newStageId) {
        await record_stage_move(unsafeData.applicationId, unsafeData.newStageId, orgId);
    }
    return result;
};

// Move one application to Trash (soft-delete, B21). Permission-gated
// (application:delete) and org-scoped in the query. Only the application
// row gets deleted_at — the candidate row, the candidate's attachments
// and candidate-details record are untouched, and the application's
// interviews/scorecards/notes stay in place until a permanent delete
// from Trash, so Restore brings everything back.
export const delete_application_action = async (applicationId: number) => {
    const { userId, orgId } = await auth();
    const parsed = await z.number().int().positive().spa(applicationId);
    const allowed = await canDeleteApplication();

    if (!userId || !orgId || !allowed || !parsed.success) {
        return { error: true, message: "There was an error deleting the application" }
    }

    const result = await delete_application_db(parsed.data, orgId);
    if (result.success) {
        await record_activity({
            action: "application.deleted",
            entity_type: "application",
            entity_id: parsed.data,
            summary: "Application moved to Trash",
        });
        return { success: true as const, message: "Application moved to Trash" };
    }
    return result;
};
