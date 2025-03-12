'use server'

import {z} from "zod";
import {create_job_listing, get_all_job_listings, get_job_listings_stages} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {formSchema, filterJobType} from "@/zod";
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
};

export const get_all_job_listings_action = async (unsafeData: z.infer<typeof filterJobType>) => {
    const {userId} = await auth();
    const {success, data} = await filterJobType.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!success || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_all_job_listings(data);
};

export const get_job_listings_stages_action = async (unsafeData: string)=> {
    const {userId} = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await get_job_listings_stages(Number(unsafeData));
};
