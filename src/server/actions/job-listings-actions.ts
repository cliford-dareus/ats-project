'use server'

import {z} from "zod";
import {create_job_listing, get_all_job_listings, get_job_by_id, get_job_listings_stages} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {jobFormSchema, filterJobSchema} from "@/zod";
import {canCreateJob} from "@/server/permissions";

const jobIdSchema = z.number();

export const create_job_action = async (unsafeData: z.infer<typeof jobFormSchema>) => {
    const {userId} = await auth();
    const {success, data} = await jobFormSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!success || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    const {id} = await create_job_listing(data);
    redirect(`/jobs/${id}`);
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema>) => {
    const {userId} = await auth();
    const {success, data} = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_job_listings(data);
};

export const get_job_by_id_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId} = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!jobId || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_by_id(jobId);
};

export const get_job_listings_stages_action = async (unsafeData: z.infer<typeof jobIdSchema>)=> {
    const {userId} = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate|| !jobId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_listings_stages(jobId);
};
