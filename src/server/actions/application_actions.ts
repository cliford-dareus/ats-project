'use server';

import {
    create_application,
    get_application_by_id,
    get_applications_with_filter, get_job_all_applications,
    getTasks, move_application_and_reorder_db,
    update_application_stage
} from "@/server/queries";
import {auth} from "@clerk/nextjs/server";
import {canCreateJob} from "@/server/permissions";
import {
    objectInputType,
    objectOutputType,
    Writeable,
    z,
    ZodDefault,
    ZodEnum,
    ZodNullable,
    ZodNumber,
    ZodObject,
    ZodOptional, ZodString,
    ZodType, ZodTypeAny,
    ZodTypeDef
} from "zod";
import {applicationFormSchema, filterApplicationsSchema} from "@/zod";

export const create_application_action = async (unsafeData: {
    job: ZodNumber["_output"];
    candidate_info: null;
    file?: ZodOptional<ZodNullable<ZodObject<{
        file_: ZodType<InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>, ZodTypeDef, InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>>;
        file_type: ZodDefault<ZodEnum<Writeable<readonly [string, string, string, string]>>>
    }, "strip", ZodTypeAny, objectOutputType<{
        file_: ZodType<InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>, ZodTypeDef, InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>>;
        file_type: ZodDefault<ZodEnum<Writeable<readonly [string, string, string, string]>>>
    }, ZodTypeAny, "strip">, objectInputType<{
        file_: ZodType<InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>, ZodTypeDef, InstanceType<File | {
            prototype: File;
            new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
        }>>;
        file_type: ZodDefault<ZodEnum<Writeable<readonly [string, string, string, string]>>>
    }, ZodTypeAny, "strip">>>>["_output"];
    candidate: string | null | undefined
} | {
    job: ZodNumber["_output"];
    candidate_info?: ZodOptional<ZodNullable<ZodObject<{
        first_name: ZodString;
        last_name: ZodString;
        email: ZodString;
        phone: ZodOptional<ZodString>;
        location: ZodOptional<ZodString>
    }, "strip", ZodTypeAny, objectOutputType<{
        first_name: ZodString;
        last_name: ZodString;
        email: ZodString;
        phone: ZodOptional<ZodString>;
        location: ZodOptional<ZodString>
    }, ZodTypeAny, "strip">, objectInputType<{
        first_name: ZodString;
        last_name: ZodString;
        email: ZodString;
        phone: ZodOptional<ZodString>;
        location: ZodOptional<ZodString>
    }, ZodTypeAny, "strip">>>>["_output"];
    file: { file_: File | null; file_type: string };
    candidate: null
}) => {
    const {userId} = await auth();
    const {success, data} = await applicationFormSchema.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!success || !userId || !canCreate) {
        return {error: true, message: "There was an error creating your product"}
    }

    return await create_application(data);
};

export const get_all_applications_action = async (unsafeData: z.infer<typeof filterApplicationsSchema>) => {
    const {userId} = await auth();
    const {success, data} = await filterApplicationsSchema.spa(unsafeData);

    if (!userId || !success) {
        return {error: true, message: "There was an error retrieving applications"}
    }

    return await get_applications_with_filter(data);
};

export const get_application_by_id_action = async (applicationId: number) => {
    const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error retrieving application"}
    }

    return await get_application_by_id(applicationId);
};

export const update_application_stage_action = async (data: { applicationId: number, new_stage_id: number }) => {
    const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error updating application stage"}
    }

    return await update_application_stage(data);
};

export const get_job_all_applications_action = async (jobId: number) => {
    const {userId} = await auth();

    if (!userId) {
        return {error: true, message: "There was an error updating application stage"}
    }

    return await get_job_all_applications(jobId);
};

export const moveApplicationAndReorder = async (unsafeData) => {
    // const {userId} = await auth();
    // const {success, data} = await candidateForm.spa(unsafeData);
    // const canCreate = await canCreateJob(userId);
    //
    // if (!userId || !success ||  !canCreate) {
    //     return { error: true, message: ""}
    // };

    return await move_application_and_reorder_db(unsafeData)
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
