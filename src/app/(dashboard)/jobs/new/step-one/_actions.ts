'use server';

import {stepOneSchema} from '@/schema';
import {redirect} from 'next/navigation';
import {FormErrors} from "@/types/job-listings-types";

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

    redirect('/');
};