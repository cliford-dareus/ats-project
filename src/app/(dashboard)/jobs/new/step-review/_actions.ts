'use server';

import { FormErrors } from "@/types";
import { create_job_action } from "@/server/actions/job-listings-actions";
import { create_job_listing } from "@/server/queries/drizzle/job-listings";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";

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
            jobOptional: {
                job_effective_date: new Date(),
                job_agency: ""
            },
            userId: 1
        };
        // Create the job listing
        await create_job_action(completeJobData);

        console.log(completeJobData);
        // The create_job_action will handle the redirect
        return undefined;

    } catch (error) {
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

        await create_job_listing({
            jobInfo: {
                ...jobInfo,
                job_description: jobInfo.job_description || "",
                job_location: jobInfo.job_location || "",
                salary_up_to: jobInfo.salary_up_to || "",
                organization: orgId,
            },
            jobTechnology,
            jobStages,
            jobOptional: {
                job_effective_date: new Date(),
                job_agency: ""
            },
            userId: 1
        }, { status: "DRAFT" });

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
