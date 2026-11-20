'use server';

import { stepThreeSchema } from '@/zod';
import { redirect } from 'next/navigation';
import { FormErrors } from "@/types";
import { auth } from '@clerk/nextjs/server';
import { canCreateJob } from '@/server/permissions';
import { get_oganization_users } from '@/server/queries';

export const stepThreeFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const data = Object.fromEntries(formData.entries());
    const validated = stepThreeSchema.safeParse(JSON.parse(data["jobStages"] as string));
    if (!validated.success) {
        const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
            const path = issue.path[0] as string;
            acc[path] = issue.message;
            return acc;
        }, {});
        return errors;
    }

    redirect('/jobs/new/step-review');
};

// Users for the job wizard. The org always comes from the session —
// never a client-supplied id — and the caller must be able to create jobs
// (same gate as the page's <HasPermission permission="job:create">).
// Returns [] when unauthenticated or unauthorized; the page renders the
// permission fallback in that case.
type User = {
    id: string,
    organization_id: string,
    name: string | null;
    email: string | null;
    username: string | null;
    image_url: string | null;
};

export const get_users = async (): Promise<User[]> => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return [];
    }

    const allowed = await canCreateJob();
    if (!allowed) {
        return [];
    }

    return await get_oganization_users(orgId);
};
