import { z } from "zod";
import { newInterviewSchema } from "@/zod";
import { db } from "@/drizzle/db";
import { interviews } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

export const create_interview_db = async (data: z.infer<typeof newInterviewSchema>, orgId: string) => {
    await db.insert(interviews).values({
        applications_id: data.applicationId,
        locations: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        type: data.type,
        link: data.link,
        status: data.status,
        organization: orgId
    })

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId: orgId,
    });
    
    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.job_id),
        orgId: orgId,
    });
};
