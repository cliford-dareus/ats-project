'use server'

import {z} from "zod";
import {
    create_job_listing,
    delete_job_listing,
    get_all_job_listings,
    get_job_by_id,
    get_job_draft_for_wizard,
    get_job_listings_stages,
    publish_job_draft,
    update_job_listing
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {jobFormSchema, filterJobSchema, updateJobListingSchema} from "@/zod";
import {assertJobBelongsToOrg, canViewJob, getAuthOrThrow, requirePermission} from "@/server/permissions";

const jobIdSchema = z.number();

// TODO: Fix validation later
export const create_job_action = async (
    unsafeData: z.infer<typeof jobFormSchema>,
    opts?: { status?: "OPEN" | "CLOSED" | "DRAFT" | "ARCHIVED" | "PENDING" }
) => {
    const { success, data, error } = await jobFormSchema.spa(unsafeData);
    if (!success) {
        return {
            error: true,
            message: "Invalid job data: " + error.issues.map((issue) => issue.message).slice(0, 3).join("; "),
        };
    }

    const { userId } = await requirePermission("job:create");

    const { id } = await create_job_listing({ ...data, userId: String(userId), ...opts });
    redirect(`/jobs/${id}`);
};

// Load a DRAFT job for the wizard (resume flow). Org comes from the
// session; the query itself only returns DRAFT rows belonging to it.
export const get_job_draft_action = async (jobId: number) => {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("job:create");
    const draft = await get_job_draft_for_wizard(jobId, orgId);
    if (!draft) {
        return { error: true, message: "Draft not found" };
    }
    return draft;
};

// Publish a draft row: validates the full job data, flips the DRAFT to
// OPEN, and redirects to the live job with a confirmation flag.
export const publish_job_draft_action = async (
    unsafeData: z.infer<typeof jobFormSchema>,
    draftId: number,
) => {
    const { success, data, error } = await jobFormSchema.spa(unsafeData);
    if (!success) {
        return {
            error: true,
            message: "Invalid job data: " + error.issues.map((issue) => issue.message).slice(0, 3).join("; "),
        };
    }

    const { userId, orgId } = await requirePermission("job:create");
    await publish_job_draft(draftId, orgId, { ...data, userId: String(userId) });
    redirect(`/jobs/${draftId}?published=1`);
};

export const update_job_action = async (unsafeData: z.infer<typeof updateJobListingSchema>) => {
    await requirePermission("job:edit");
    const {success, data} = await updateJobListingSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data.jobId, orgId);

    await update_job_listing(data);
    return {success: true};
};

export const delete_job_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    await requirePermission("job:delete");
    const {success, data} = await jobIdSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data, orgId);

    await delete_job_listing(data, orgId);
    return {success: true};
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema>) => {
    const {userId} = await getAuthOrThrow();
    await requirePermission("job:view");
    const {success, data} = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_job_listings(data);
};

export const get_job_by_id_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId, orgId} = await getAuthOrThrow();
    await requirePermission("job:view");
    const jobId = jobIdSchema.parse(unsafeData);

    if (!jobId || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_by_id(jobId, orgId);
};

export const get_job_listings_stages_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId} = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const allowed = await canViewJob();

    if (!userId || !allowed || !jobId) {
        return {error: true, message: "There was an error retrieving job stages"}
    }

    return await get_job_listings_stages(jobId);
};