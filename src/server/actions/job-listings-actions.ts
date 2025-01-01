'use server'

import {z} from "zod";
import {create_job_listing} from "@/server/db/job-listings";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {formSchema} from "@/schema";
import {canCreateJob} from "@/server/permissions";

export const create_job_action = async (unsafeData: z.infer<typeof formSchema>): Promise<{
    error: boolean;
    message: string
} | undefined> => {
    const {userId} = await auth();
    const {success, data} = await formSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!success || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    const {id} = await create_job_listing({...data, userId: userId});
    redirect(`/jobs/${id}`);
}
