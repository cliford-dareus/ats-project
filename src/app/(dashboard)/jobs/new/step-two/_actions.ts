'use server';

import { stepTwoSchema } from '@/zod';
import { FormErrors } from "@/types";
import { redirect } from 'next/navigation';
import { update_job_draft_technologies } from "@/server/queries/drizzle/job-listings";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export const stepTwoFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const data = Object.fromEntries(formData.entries());
    const validated = stepTwoSchema.safeParse(JSON.parse(data["jobTechnology"] as string));
    if (!validated.success) {
        const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
            const path = issue.path[0] as string;
            acc[path] = issue.message;
            return acc;
        }, {});
        return errors;
    }

    const { userId, orgId } = await auth();
    if (!userId || !orgId || !(await canCreateJob())) {
        return { general: "You are not authorized to create job listings" };
    }

    const draftIdRaw = formData.get("draftId");
    const draftId = typeof draftIdRaw === "string" && draftIdRaw !== "" ? Number(draftIdRaw) : null;

    try {
        // Persist this step's technologies to the draft row (when the
        // wizard is carrying one); without a draft there is nothing to
        // save yet and the old validate-and-redirect behavior stands.
        if (draftId !== null && !Number.isNaN(draftId)) {
            await update_job_draft_technologies(draftId, orgId, validated.data);
            redirect(`/jobs/new/step-three?draft=${draftId}`);
        }
        redirect('/jobs/new/step-three');
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error saving job draft:", error);
        return { general: "Could not save your progress. Please try again." };
    }
};
