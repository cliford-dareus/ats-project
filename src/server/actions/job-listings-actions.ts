'use server'

import {z} from "zod";
import {
    create_job_listing,
    delete_job_listing,
    get_all_job_listings,
    get_job_by_id,
    get_job_draft_for_wizard,
    get_job_listings_stages,
    get_jobs_sidebar_counts,
    JOB_LIST_SORTS,
    JobListSort,
    publish_job_draft,
    update_job_listing
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {jobFormSchema, filterJobSchema, updateJobListingSchema} from "@/zod";
import {assertJobBelongsToOrg, canViewJob, getAuthOrThrow, requirePermission} from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";

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
    // The wizard reuses this action for all three outcomes — the requested
    // status is what distinguishes them (OPEN = publish flow, DRAFT =
    // draft save, no status = plain create).
    const action =
        opts?.status === "OPEN"
            ? "job.published"
            : opts?.status === "DRAFT"
                ? "job.draft_saved"
                : "job.created";
    const verb =
        action === "job.published"
            ? "Published"
            : action === "job.draft_saved"
                ? "Saved draft for"
                : "Created";
    await record_activity({
        action,
        entity_type: "job",
        entity_id: id,
        summary: `${verb} job "${data.jobInfo.job_name}"`,
    });
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
    await record_activity({
        action: "job.published",
        entity_type: "job",
        entity_id: draftId,
        summary: `Published job "${data.jobInfo.job_name}"`,
    });
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

// Move a job to Trash (soft-delete). The job and its live applications
// get deleted_at set; stages, technologies, automation rules and the
// applications' interviews/scorecards stay in place, invisible while the
// job is trashed, so Restore brings them back. Candidates are untouched.
export const delete_job_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    await requirePermission("job:delete");
    const {success, data} = await jobIdSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    const job = await assertJobBelongsToOrg(data, orgId);

    const { cascadedApplications } = await delete_job_listing(data, orgId);

    await record_activity({
        action: "job.deleted",
        entity_type: "job",
        entity_id: data,
        summary: `Job "${job.name}" moved to Trash` +
            (cascadedApplications > 0
                ? ` (${cascadedApplications} application${cascadedApplications === 1 ? "" : "s"} also moved to Trash)`
                : ""),
    });

    return {success: true, message: "Job moved to Trash"};
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema> & { sort?: string }) => {
    const {userId} = await getAuthOrThrow();
    await requirePermission("job:view");
    const {success, data} = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    // B9: `sort` is not part of filterJobSchema — validate it against the
    // allowlist and pass it through alongside the zod filter.
    const sort: JobListSort | undefined = JOB_LIST_SORTS.includes(unsafeData.sort as JobListSort)
        ? (unsafeData.sort as JobListSort)
        : undefined;

    return await get_all_job_listings({ ...data, sort });
};

// B16: real counts for the jobs sidebar footer (live OPEN jobs + live
// candidates for the session org). Session-gated (job:view); the org
// always comes from the session, never from the caller.
export const get_jobs_sidebar_counts_action = async () => {
    const { userId, orgId } = await getAuthOrThrow();
    await requirePermission("job:view");

    if (!userId || !orgId) {
        return { error: true, message: "There was an error retrieving job counts" };
    }

    return await get_jobs_sidebar_counts(orgId);
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