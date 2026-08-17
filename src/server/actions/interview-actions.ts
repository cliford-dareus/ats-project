"use server";

import { newInterviewSchema } from "@/zod";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { create_interview_db } from "../queries/drizzle/interview";


export const create_interview_action = async (unsafeData: z.infer<typeof newInterviewSchema>) => {
    const { userId, orgId } = await auth();
    const { success, data } = await newInterviewSchema.spa(unsafeData);
    console.log(unsafeData);
    
    // need to check if the user can create an interview
    // const can_create_interview = await can_create_interview(userId);
    if (!userId || !success || !orgId) {
        throw new Error("Invalid data");
    }
    
    return await create_interview_db(data, orgId);
}