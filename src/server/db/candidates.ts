import {db} from "@/drizzle/db";
import {applications, candidates, job_listings, stages} from "@/drizzle/schema";
import {and, eq} from "drizzle-orm";
import type {CandidateType} from "@/types/job-listings-types";
import {CACHE_TAGS, dbCache, getGlobalTag, revalidateDbCache} from "@/lib/cache";



// export const get_candidate_with_details = async (candidateId: number) => {
//     const result = await db
//         .select({
//             candidateId: candidates.id,
//             candidateName: candidates.name,
//             stageName: stages.stage_name,
//             jobName: job_listings.name,
//         })
//         .from(candidates)
//         .innerJoin(stages, eq(candidates.current_stage_id, stages.id))
//         .innerJoin(job_listings, eq(candidates.job_id, job_listings.id))
//         .where(eq(candidates.id, candidateId));
//
//     return result;
// }

export const get_all_candidates = async () => {
    const cacheFn = dbCache(get_all_candidates_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.candidates)
        ]
    });

    return cacheFn();
};

export const get_all_candidates_db = async () => {
    return db.select().from(candidates);
};