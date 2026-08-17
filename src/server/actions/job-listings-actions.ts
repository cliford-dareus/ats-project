'use server'

import {z} from "zod";
import {
    create_job_listing,
    delete_job_listing,
    get_all_job_listings,
    get_job_by_id,
    get_job_listings_stages,
    update_job_listing
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {jobFormSchema, filterJobSchema, updateJobListingSchema} from "@/zod";
import {assertJobBelongsToOrg, canCreateJob, getAuthOrThrow} from "@/server/permissions";

const jobIdSchema = z.number();

// TODO: Fix validation later
export const create_job_action = async (unsafeData: z.infer<typeof jobFormSchema>) => {
    // const { success, data } = await jobFormSchema.spa(unsafeData);
    // if (!success) {
    //     return { error: true, message: "There was an error creating your product" }
    // }

    // const {userId} = await auth();
    // await canCreateJob(userId);
    console.log('Job created:');

    const {id} = await create_job_listing(unsafeData);
    redirect(`/jobs/${id}`);
};

export const update_job_action = async (unsafeData: z.infer<typeof updateJobListingSchema>) => {
    const {success, data} = await updateJobListingSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data.jobId, orgId);

    await update_job_listing(data);
    return {success: true};
};

export const delete_job_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {success, data} = await jobIdSchema.spa(unsafeData);
    if (!success) {
        return {error: true, message: "There was an error updating your product"}
    }

    const {orgId} = await getAuthOrThrow();
    await assertJobBelongsToOrg(data, orgId);

    await delete_job_listing(data, orgId);
    return {success: true};
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobSchema>) => {
    const {userId} = await getAuthOrThrow();
    const {success, data} = await filterJobSchema.spa(unsafeData);

    if (!success || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_job_listings(data);
};

export const get_job_by_id_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId, orgId} = await getAuthOrThrow();
    const jobId = jobIdSchema.parse(unsafeData);

    if (!jobId || !userId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_by_id(jobId, orgId);
};

export const get_job_listings_stages_action = async (unsafeData: z.infer<typeof jobIdSchema>) => {
    const {userId} = await auth();
    const jobId = jobIdSchema.parse(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate || !jobId) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_listings_stages(jobId);
};