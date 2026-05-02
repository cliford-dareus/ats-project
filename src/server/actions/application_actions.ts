'use server';

import {
    create_application,
    get_application_by_id,
    get_applications_with_filter,
    getTasks,
    update_application_stage
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {z} from "zod";
import {candidateForm, filterApplicationsType} from "@/zod";

export const create_application_action = async (unsafeData: z.infer<typeof candidateForm>) => {
    const {userId} = await auth();
    const {success, data} = await candidateForm.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!success || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await create_application(data);
};

export const get_all_applications_action = async (unsafeData: z.infer<typeof filterApplicationsType>) => {
    const {userId} = await auth();
    const {success, data} = await filterApplicationsType.spa(unsafeData);

    if (!userId || !success) {
        return {error: true, message: "There was an error retrieving applications"}
    }

    return get_applications_with_filter(data);
};

export const get_application_by_id_action = async (data: { applicationId: number }) => {
    const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error retrieving application"}
    }

    return await get_application_by_id(data.applicationId);
};

export const update_application_stage_action = async (data: { applicationId: number, new_stage_id: number }) => {
    const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error updating application stage"}
    }

    return await update_application_stage(data);
};

// export const delete_application_action = async (data: { candidateId: number }) => {
// };

export const get_all_tasks_action = async () => {
     const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error retrieving applications"}
    }

    return await getTasks();
};
