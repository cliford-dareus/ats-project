"use server";

import { FormErrors } from "@/types";
import { JOB_STATUS, updateJobListingSchema } from "@/zod";
import { update_job_listing as update_job_listing_db } from "@/server/queries";
import {
    AuthzError,
    assertJobBelongsToOrg,
    requirePermission,
} from "@/server/permissions";

// The options form only edits the job name and status. The old action
// validated the submission against updateJobSchema — which requires seven
// fields (description, location, salary, department, type, ...) the form
// never sends, under the field name `status` the form never used — and then
// returned without ever touching the database. This validates exactly what
// the form submits, gates on job:edit, asserts the job belongs to the
// session org, and persists through the real update query.
export const update_job_listing = async (prevState: FormErrors | undefined, formData: FormData) => {
    const jobId = Number(formData.get("job_id"));
    const name = String(formData.get("job_name") ?? "").trim();
    const status = formData.get("status");

    const errors: FormErrors = {};
    if (!Number.isInteger(jobId) || jobId <= 0) {
        errors._form = "Invalid job.";
    }
    if (!name) {
        errors.job_name = "Job name is required.";
    }
    const parsedStatus = JOB_STATUS.safeParse(status);
    if (!parsedStatus.success) {
        errors.job_status = "Choose a valid job status.";
    }
    if (Object.keys(errors).length > 0) {
        return errors;
    }

    try {
        const { orgId } = await requirePermission("job:edit");
        await assertJobBelongsToOrg(jobId, orgId);

        const { success } = await updateJobListingSchema.spa({
            jobId,
            name,
            status: parsedStatus.data,
        });
        if (!success) {
            return { _form: "There was an error updating the job." };
        }

        await update_job_listing_db({ jobId, name, status: parsedStatus.data });
        return { _success: "Job updated." };
    } catch (err) {
        if (err instanceof AuthzError) {
            return { _form: err.status === 404 ? "Job not found." : err.message };
        }
        console.error("update_job_listing action failed:", err);
        return { _form: "There was an error updating the job." };
    }
};

// Public candidate-facing URL for one job, for the Share buttons on the job
// detail header and the job preview. The subdomain comes from the job row
// itself (asserted to belong to the session org) — never from the client.
export const get_job_career_url_action = async (jobId: number): Promise<{ success: true; url: string } | { success: false; error: string }> => {
    try {
        const { orgId } = await requirePermission("job:view");
        const job = await assertJobBelongsToOrg(jobId, orgId);
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";
        return {
            success: true,
            url: `https://${job.subdomain}.${rootDomain}/apply/${jobId}`,
        };
    } catch (err) {
        if (err instanceof AuthzError) {
            return { success: false, error: "Job not found." };
        }
        console.error("get_job_career_url_action failed:", err);
        return { success: false, error: "Could not build the share link." };
    }
};
