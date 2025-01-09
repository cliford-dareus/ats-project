import {db} from "@/drizzle/db";
import {applications, candidates, interviews, job_listings, scoreCards, stages} from "@/drizzle/schema";
import {and, eq} from "drizzle-orm";
import type {CandidateType} from "@/types/job-listings-types";
import {CACHE_TAGS, dbCache, getGlobalTag, revalidateDbCache} from "@/lib/cache";



export const get_candidate_with_details = async (candidateId: number) => {
    const result = await db
        .select({
            candidateId: candidates.id,
            candidateName: candidates.name,
            candidate_status: candidates.status,
            stageName: stages.stage_name,
            jobName: job_listings.name,

            interview_status: interviews.status,
            interview_location: interviews.locations,
            interview_start: interviews.start_at,
            interview_end: interviews.end_at,
            interview_interviewer: scoreCards.interviewer,
            overall_recommendation: scoreCards.overall_recommendations,
        })
        .from(candidates)
        .leftJoin(applications, eq(applications.candidate, candidates.id))
        .innerJoin(stages, eq(applications.current_stage_id, stages.id))
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(interviews, eq(interviews.applications_id, applications.id))
        .leftJoin(scoreCards, eq(scoreCards.interviews_id, interviews.id))
        .where(eq(candidates.id, candidateId));
    return result;
}

export const get_all_candidates = async () => {
    const cacheFn = dbCache(get_all_candidates_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.candidates)
        ]
    });

    return cacheFn();
};

// export const get_candidate_with_details = async () => {
//     return  db.select().from(candidates);
// };

export const get_all_candidates_db = async () => {
    return db.select().from(candidates);
};