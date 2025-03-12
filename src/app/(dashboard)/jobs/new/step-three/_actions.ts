'use server';

import {stepThreeSchema} from '@/zod';
import {redirect} from 'next/navigation';
import {FormErrors} from "@/types/job-listings-types";

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