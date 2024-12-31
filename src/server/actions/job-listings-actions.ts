'use server'

import {update_candidate_stage} from "@/server/db/candidates";
import {z} from "zod";
import {create_job_listing} from "@/server/db/job-listings";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {formSchema} from "@/schema";

export const update_candidate_stage_action = async (data: { candidateId: number, current_stage_id: number }) => {
    // Check user role and auth first
    try {
        await update_candidate_stage(data)
    } catch (err) {
        return err;
    }
}

export const create_job_action = async (unsafeData: z.infer<typeof formSchema>): Promise<{ error: boolean; message: string } | undefined> => {
    // check auth
    const {userId} = await auth()
    const { success, data} = await  formSchema.spa(unsafeData);
    // check if user can create jobs

    if (!success) {
        return { error: true, message: "There was an error creating your product" }
    }

    const {id} = await create_job_listing({...data, userId: userId});
    redirect(`/jobs/${id}`)
}
