'use server';

import { FormErrors } from "@/types";
import { redirect } from "next/navigation";
import { create_job_action, publish_job_draft_action } from "@/server/actions/job-listings-actions";
import { update_job_draft_info, update_job_draft_stages, update_job_draft_technologies } from "@/server/queries/drizzle/job-listings";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";

const parseDraftId = (formData: FormData): number | null => {
    const raw = formData.get("draftId");
    if (typeof raw !== "string" || raw === "") return null;
    const id = Number(raw);
    return Number.isNaN(id) ? null : id;
};

export const stepReviewFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const { userId, orgId } = await auth();
    const canCreate = await canCreateJob();

    if (!userId || !orgId || !canCreate) {
        return {
            general: "You are not authorized to create a job listing"
        };
    }

    try {
        // Get the job data from the context/session storage
        // Since we can't directly access the context in server actions,
        // we'll need to pass the data through hidden form fields or reconstruct it

        // For now, let's assume the data is passed through the form
        const jobInfoData = formData.get('jobInfo');
        const jobTechnologyData = formData.get('jobTechnology');
        const jobStagesData = formData.get('jobStages');

        if (!jobInfoData || !jobTechnologyData || !jobStagesData) {
            return {
                general: "Missing job data. Please go back and complete all steps."
            };
        }

        const jobInfo = JSON.parse(jobInfoData as string);
        const jobTechnology = JSON.parse(jobTechnologyData as string);
        const jobStages = JSON.parse(jobStagesData as string);

        // Validate required fields
        if (!jobInfo.job_name || !jobInfo.job_description || !jobInfo.job_location) {
            return { general: "Please complete all required job details..." };
        }

        if (jobTechnology.length === 0) {
            return { general: "Please add some Job requirements..." };
        }

        if (jobStages.length === 0) {
            return { general: "Please add some Job stages..." };
        }

        // Construct the complete job data
        const completeJobData = {
            jobInfo: {
                ...jobInfo,
                organization: orgId,
            },
            jobTechnology,
            jobStages,
            userId: String(userId),
        };
        // Publish: when the wizard is carrying a draft row, flip that row
        // to OPEN; otherwise create a new OPEN job. Either way the action
        // redirects to the live job on success — a returned error object
        // means validation failed.
        const draftId = parseDraftId(formData);
        const result = draftId !== null
            ? await publish_job_draft_action(completeJobData, draftId)
            : await create_job_action(completeJobData, { status: "OPEN" });
        if (result && "error" in result && result.error) {
            return { general: result.message ?? "There was an error creating your job listing. Please try again." };
        }
        return undefined;
    } catch (error) {
        // redirect() throws a special error — let it through, otherwise a
        // successful publish would be swallowed and shown as a failure.
        if (isRedirectError(error)) {
            throw error;
        }
        console.error('Error creating job listing:', error);
        return {
            general: "There was an error creating your job listing. Please try again."
        };
    }
};

export const saveDraftAction = async (prevState: FormErrors | undefined, formData: FormData) => {
    const { userId, orgId } = await auth();
    const canCreate = await canCreateJob();

    if (!userId || !orgId || !canCreate) {
        return {
            general: "You are not authorized to save a draft"
        };
    }

    try {
        const jobInfoData = formData.get('jobInfo');
        const jobTechnologyData = formData.get('jobTechnology');
        const jobStagesData = formData.get('jobStages');

        if (!jobInfoData) {
            return {
                general: "No job data to save"
            };
        }

        const jobInfo = JSON.parse(jobInfoData as string);
        const jobTechnology = jobTechnologyData ? JSON.parse(jobTechnologyData as string) : [];
        const jobStages = jobStagesData ? JSON.parse(jobStagesData as string) : [];

        // Drafts are lenient: only the job name is required. Everything else
        // can be finished later from the drafts tab.
        if (!jobInfo.job_name) {
            return { general: "Give the job a name before saving a draft." };
        }

        const draftId = parseDraftId(formData);
        const normalizedJobInfo = {
            ...jobInfo,
            job_description: jobInfo.job_description || "",
            job_location: jobInfo.job_location || "",
            salary_up_to: jobInfo.salary_up_to || "",
            organization: orgId,
        };

        // When the wizard is carrying a draft row, update that row in
        // place instead of creating a second draft. (The create-a-new-draft
        // path below goes through create_job_action with status DRAFT,
        // which records job.draft_saved itself.)
        if (draftId !== null) {
            await update_job_draft_info(draftId, orgId, normalizedJobInfo);
            await update_job_draft_technologies(draftId, orgId, jobTechnology);
            await update_job_draft_stages(draftId, orgId, String(userId), jobStages);
            await record_activity({
                action: "job.draft_saved",
                entity_type: "job",
                entity_id: draftId,
                summary: `Saved draft for job "${normalizedJobInfo.job_name}"`,
            });
            redirect('/jobs?tab=drafts');
        }

        const result = await create_job_action({
            jobInfo: normalizedJobInfo,
            jobTechnology,
            jobStages,
            userId: ""
        }, { status: "DRAFT" });

        if (result && "error" in result && result.error) {
            return { general: result.message ?? "There was an error saving your draft. Please try again." };
        }

        redirect('/jobs?tab=drafts');
    } catch (error) {
        // redirect() throws a special error — let it through.
        if (isRedirectError(error)) {
            throw error;
        }
        console.error('Error saving draft:', error);
        return {
            general: "There was an error saving your draft. Please try again."
        };
    }
};
