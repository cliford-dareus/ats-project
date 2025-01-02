'use server';


import {create_application, update_application_stage} from "@/server/db/application";
import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {z} from "zod";
import {candidateForm} from "@/schema";

export const create_application_action = async (unsafeData: z.infer<typeof candidateForm>) => {
    const {userId} = await auth();
    const {success, data} = await candidateForm.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    // if (!success || !userId || !canCreate) {
    //     return {error: true, message: "There was an error creating your product"}
    // }

    console.log(success, data);

    return await create_application(data)
}

export const update_application_stage_action = async (data: { candidateId: number, current_stage_id: number }) => {
    // Check user role and auth first
    try {
        await update_application_stage(data)
    } catch (err) {
        return err;
    }
}