import {db} from "@/drizzle/db";
import {candidates, job_listings, stages} from "@/drizzle/schema";
import {and, eq} from "drizzle-orm";
import type {CandidateType} from "@/types/job-listings-types";
import {CACHE_TAGS, revalidateDbCache} from "@/lib/cache";

export const create_candidate = async (data: CandidateType) => {
    const [current_stage] = await db
        .select()
        .from(stages)
        .where(and(eq(stages.job_id, data.job_id!), eq(stages.stage_order_id, data.current_stage_id!)));

    try {
        const candidate = await db.insert(candidates).values({
            ...data,
            current_stage_id: current_stage.id,
        });
        return [candidate];
    } catch (err) {
        console.log(err);
    }
};

export const update_candidate_stage = async (data: { candidateId: number, current_stage_id: number }) => {
    const [{fieldCount}]= await db.update(candidates)
        .set({current_stage_id: data.current_stage_id})
        .where(eq(candidates.id, data.candidateId as number))


    console.log(fieldCount)
    // revalidateDbCache({
    //     tag: CACHE_TAGS.candidates,
    //     id: String(candidates.id),
    // })
}

export const get_candidate_with_details = async (candidateId: number) => {
    const result = await db
        .select({
            candidateId: candidates.id,
            candidateName: candidates.name,
            stageName: stages.stage_name,
            jobName: job_listings.name,
        })
        .from(candidates)
        .innerJoin(stages, eq(candidates.current_stage_id, stages.id))
        .innerJoin(job_listings, eq(candidates.job_id, job_listings.id))
        .where(eq(candidates.id, candidateId));

    return result;
}