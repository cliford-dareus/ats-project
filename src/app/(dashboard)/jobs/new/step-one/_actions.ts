'use server';

import { stepOneSchema } from '@/zod';
import { redirect } from 'next/navigation';
import { FormErrors } from "@/types";
import { get_org_departments } from "@/server/queries/drizzle/organization";
import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";

export const stepOneFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const data = Object.fromEntries(formData.entries());
    const validated = stepOneSchema.safeParse(data);
    console.log(validated);
    if (!validated.success) {
        const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
            const path = issue.path[0] as string;
            acc[path] = issue.message;
            return acc;
        }, {});
        return errors;
    }

    redirect('/jobs/new/step-two');
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
