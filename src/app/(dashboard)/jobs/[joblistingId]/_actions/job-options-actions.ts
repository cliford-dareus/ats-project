"use server";

import {FormErrors} from "@/types";
import {updateJobSchema} from "@/zod";

export const update_job_listing = async (prevState: FormErrors | undefined, formData: FormData) => {
    const data = Object.fromEntries(formData.entries());
    console.log(data)
    const validated = updateJobSchema.safeParse(data);
    if (!validated.success) {
        const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
            const path = issue.path[0] as string;
            acc[path] = issue.message;
            return acc;
        }, {});
        return errors;
    }
};