'use server';

import {stepTwoSchema} from '@/schema';
import {FormErrors} from "@/types/job-listings-types";
import {redirect} from 'next/navigation';

export const stepTwoFormAction = async (
    prevState: FormErrors | undefined,
    formData: FormData
) => {
    const data = Object.fromEntries(formData.entries());
    const validated = stepTwoSchema.safeParse(data);
    if (!validated.success) {
        const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
            const path = issue.path[0] as string;
            acc[path] = issue.message;
            return acc;
        }, {});
        return errors;
    }

    redirect('');
};