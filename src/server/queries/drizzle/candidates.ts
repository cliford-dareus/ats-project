import {db} from "@/drizzle/db";
import {applications, candidates, interviews, job_listings, scoreCards, stages} from "@/drizzle/schema";
import {and, eq, SQL} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag, revalidateDbCache} from "@/lib/cache";
import {z} from "zod";
import {filterCandidateType, newCandidateForm} from "@/zod";

export const create_candidate = async (data: z.infer<typeof newCandidateForm>) => {
    const [candidate] = await db.insert(candidates).values({...data, cv_path: data.resume}).$returningId();

    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
    });

    return candidate
};

export const get_all_candidates = async (filter: z.infer<typeof filterCandidateType>) => {
    const cacheFn = dbCache(get_all_candidates_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.candidates)
        ]
    });
    return cacheFn(filter);
};

export const get_candidate_with_details = async (unsafedata: number) => {
    const result = await db
        .select({
            candidateId: candidates.id,
            candidateName: candidates.name,
            candidate_status: candidates.status,
            // stageName: stages.stage_name,
            // jobName: job_listings.name,

            // interview_status: interviews.status,
            // interview_location: interviews.locations,
            // interview_start: interviews.start_at,
            // interview_end: interviews.end_at,
            // interview_interviewer: scoreCards.interviewer,
            // overall_recommendation: scoreCards.overall_recommendations,
        })
        .from(candidates)
        // .leftJoin(applications, eq(applications.candidate, candidates.id))
        // .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        // .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        // .leftJoin(interviews, eq(interviews.applications_id, applications.id))
        // .leftJoin(scoreCards, eq(scoreCards.interviews_id, interviews.id))
        .where(eq(candidates.id, unsafedata));
    console.log(result)
    return result;
}

const get_all_candidates_db = async (filter: z.infer<typeof filterCandidateType>) => {
    const filters: SQL[] = []

    if (filter?.name) filters.push(eq(candidates.name, filter.name))

    const candidate = await db.select()
        .from(candidates)
        .where(and(...filters))
        .limit(filter.limit)
        .offset(filter.offset);

    const len = candidate.length
    return [len, candidate];
};
