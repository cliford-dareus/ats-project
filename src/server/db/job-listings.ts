import {candidates, job_listings, stages} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, inArray, SQL} from "drizzle-orm";
import {filterJobType} from "@/types/job-listings-types";

export const get_all_job_listings = async (filter: filterJobType) => {
    const filters: SQL[] = []

    if (filter.location) filters.push(inArray(job_listings.location, filter.location as string[]))
    // if(filter.department) filters.push(inArray(job_listings.department, filter.department as string[]))
    // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
    // if(filter.status) filters.push(eq(job_listings.status, filter.status))

    const jobListings = await db.select({
        id: job_listings.id,
        name: job_listings.name,
        location: job_listings.location,
        created_at: job_listings.created_at,
        updated_at: job_listings.updated_at,
        createdBy: job_listings.createdBy,
        candidatesCount: db.$count(candidates, eq(candidates.job_id, job_listings.id))
    })
        .from(job_listings)
        .where(and(...filters))
        .limit(filter.limit)
        .offset(filter.offset)

    const len = jobListings.length

    return [len, jobListings];
}

export const get_job_listing_with_candidate = async (jobId: number) => {
    const result = await db
        .select({
            job_id: job_listings.id,
            name: job_listings.name,
            location: job_listings.location,
            created_at: job_listings.created_at,
            updated_at: job_listings.updated_at,
            createdBy: job_listings.createdBy,
            stageName: stages.stage_name,
            candidate_id: candidates.id
        })
        .from(job_listings)
        .innerJoin(candidates, eq(candidates.job_id, job_listings.id))
        .innerJoin(stages, eq(candidates.current_stage_id, stages.stage_order_id))
        .where(eq(job_listings.id, jobId))

        return result
}

export const create_job_listing = async (data: typeof job_listings.$inferInsert) => {
    await db.insert(job_listings).values({
        name: data.name,
        location: data.location,
        salary_up_to: data.salary_up_to,
        description: data.description,
        createdBy: data.createdBy,
        // department: data.department,
    })
}

// export const update_job_listing = async (data: Partial<filterJobType>) => {
// }
//
// export const delete_job_listing = async (data) => {
// }