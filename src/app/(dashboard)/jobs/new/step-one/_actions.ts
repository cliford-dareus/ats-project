'use server';

import { stepOneSchema } from '@/zod';
import { redirect } from 'next/navigation';
import { FormErrors } from "@/types";
import { get_org_departments } from "@/server/queries/drizzle/organization";
import { create_job_listing, update_job_draft_info } from "@/server/queries/drizzle/job-listings";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export const stepOneFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const data = Object.fromEntries(formData.entries());
    const validated = stepOneSchema.safeParse(data);
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

    // The wizard's progress lives in a DRAFT job row: a resumed draft
    // carries its id in a hidden field, a fresh wizard creates the row
    // here. Either way the next step carries ?draft=<id>.
    const draftIdRaw = formData.get("draftId");
    const draftId = typeof draftIdRaw === "string" && draftIdRaw !== "" ? Number(draftIdRaw) : null;

    try {
        // salary_from is optional in the step schema; the draft helpers
        // take the full jobFormSchema jobInfo, where it is a plain string
        // ("" means unset — the queries store it as null).
        const jobInfo = { ...validated.data, salary_from: validated.data.salary_from ?? "", organization: orgId };
        let id = draftId;
        if (id !== null && !Number.isNaN(id)) {
            await update_job_draft_info(id, orgId, jobInfo);
        } else {
            const created = await create_job_listing({
                jobInfo,
                jobTechnology: [],
                jobStages: [],
                userId: String(userId),
            }, { status: "DRAFT" });
            id = created.id;
        }
        redirect(`/jobs/new/step-two?draft=${id}`);
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
        console.error("Error saving job draft:", error);
        return { general: "Could not save your progress. Please try again." };
    }
};

// Departments for the job wizard. The org always comes from the session —
// never a client-supplied id — and the caller must be able to create jobs
// (same gate as the page's <HasPermission permission="job:create">).
// Returns [] when unauthenticated or unauthorized; the page renders the
// permission fallback in that case.
export const get_dept = async (): Promise<{ id: number, organization_id: string, name: string | null }[]> => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return [];
    }

    const allowed = await canCreateJob();
    if (!allowed) {
        return [];
    }

    return await get_org_departments(orgId);
};
