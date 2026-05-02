'use server';

import {stepTwoSchema} from '@/zod';
import {FormErrors} from "@/types";
import {redirect} from 'next/navigation';

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

    redirect('/jobs/new/step-three');
};