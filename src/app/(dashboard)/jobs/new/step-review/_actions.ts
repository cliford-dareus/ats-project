'use server';

import { FormErrors } from "@/types";
import { create_job_action } from "@/server/actions/job-listings-actions";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";

export const stepReviewFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const { userId, orgId } = await auth();
    const canCreate = await canCreateJob(userId);

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
            userId: userId
        };

        // Create the job listing
        await create_job_action(completeJobData);

        // The create_job_action will handle the redirect
        return undefined;

    } catch (error) {
        console.error('Error creating job listing:', error);
        return {
            general: "There was an error creating your job listing. Please try again."
        };
    }
};

export const saveDraftAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const { userId, orgId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !orgId || !canCreate) {
        return {
            general: "You are not authorized to save a draft"
        };
    }

    try {
        // Here you would save the job as a draft
        // This could be stored in a separate drafts table or with a status field

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

        // Save as draft (you'll need to implement this in your queries)
        // await save_job_draft({
        //     ...jobInfo,
        //     jobTechnology,
        //     jobStages,
        //     organization: orgId,
        //     userId: userId,
        //     status: 'draft'
        // });

        redirect('/jobs?tab=drafts');

    } catch (error) {
        console.error('Error saving draft:', error);
        return {
            general: "There was an error saving your draft. Please try again."
        };
    }
};
