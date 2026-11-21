'use server';

import {
    create_application, create_application_for_candidate_db, get_all_applications,
    get_application_by_id, get_job_all_applications,
    move_application_and_reorder_db,
    update_application,
    update_application_stage
} from "@/server/queries";
import { auth } from "@clerk/nextjs/server";
import { canEditApplication, canMoveApplication, canViewApplication, requirePermission } from "@/server/permissions";
import { z } from "zod";
import { applicationFormSchema, filterApplicationsSchema, moveAndReorderApplicationSchema, updateApplicationSchema, updateApplicationStageSchema } from "@/zod";

// NOTE: intentionally NOT permission-gated — this is the public apply
// path (src/app/(public)/[domain]/_components/apply-form.tsx), called by
// unauthenticated applicants. The dashboard "Add Applicant" modal uses
// create_application_for_candidate_action instead (session-gated).
// Do not add a session permission check here without splitting the two flows.
export const create_application_action = async (unsafeData: z.infer<typeof applicationFormSchema>) => {
    const { success, data } = await applicationFormSchema.spa(unsafeData);

    if (!success) {
        throw new Error("There was an error");
    }

    return await create_application(data);
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

    return await update_application_stage(data, orgId);
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
    const { userId } = await auth();
    const allowed = await canViewApplication();

    if (!userId || !allowed) {
        return { error: true, message: "There was an error retrieving job applications" }
    }

    return await get_job_all_applications(jobId);
};

export const moveApplicationAndReorder = async (unsafeData: z.infer<typeof moveAndReorderApplicationSchema>) => {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Unauthorized" };
    }

    const allowed = await canMoveApplication();
    if (!allowed) {
        return { success: false, error: "Missing permission: application:move" };
    }

    return await move_application_and_reorder_db(unsafeData)
};

// export const delete_application_action = async (data: { candidateId: number }) => {
// };
