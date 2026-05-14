'use server';

import {stepOneSchema} from '@/zod';
import {redirect} from 'next/navigation';
import {FormErrors} from "@/types";
import {get_org_departments} from "@/server/queries/drizzle/organization";

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

export const get_dept = async (id: string) => {
    return await get_org_departments(id);
};