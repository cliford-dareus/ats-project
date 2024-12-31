import {candidates, job_listings, job_technologies, stages, technologies} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, inArray, SQL} from "drizzle-orm";
import {filterJobType} from "@/types/job-listings-types";
import {CACHE_TAGS, dbCache, getGlobalTag, getIdTag, revalidateDbCache} from "@/lib/cache";
import {z} from "zod";
import {formSchema} from "@/schema";

export const create_job_listing = async (data: z.infer<typeof formSchema> & { userId: string | null }) => {
    return await db.transaction(async (trx) => {
        const [inserted_job] = await trx.insert(job_listings).values({
            name: data.jobInfo.job_name,
            location: data.jobInfo.job_location,
            salary_up_to: data.jobInfo.salary_up_to,
            description: data.jobInfo.job_description,
            createdBy: data.userId!,
            // department: data.department,
        }).$returningId()

        if (!inserted_job) {
            trx.rollback()
        }

        const techs = await trx.insert(technologies).values(
            data.jobTechnology.map((item) => ({
                name: item.technology,
                years_experience: Number(item.year_of_experience),
            }))
        ).$returningId()

        for (const tech of techs) {
            await trx.insert(job_technologies).values({
                id: tech.id * 2,
                job_id: inserted_job.id,
                technology_id: tech.id
            })
        }

        await trx.insert(stages).values(
            data.jobStages.map((item) => ({
                job_id: inserted_job.id,
                stage_name: item.stage_name,
                stage_order_id: 1,
                assign_to: 'sss',
            }))
        );

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            // userId: newProduct.userId,
            id: String(inserted_job.id),
        })

        return inserted_job
    })
}

export const get_job_listings_stages = (jobId: number) => {
    const cacheFn = dbCache(get_job_listings_stages_db, {
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.stages)
        ]
    })

    return cacheFn(jobId)
}

export const get_all_job_listings = (filter: filterJobType) => {
    const cacheFn = dbCache(get_all_job_listings_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.jobs)
        ]
    })

    return cacheFn(filter)
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
            candidate_id: candidates.id,
            stage_order_id: stages.stage_order_id,
        })
        .from(job_listings)
        .innerJoin(candidates, eq(candidates.job_id, job_listings.id))
        .innerJoin(stages, eq(candidates.current_stage_id, stages.stage_order_id))
        .where(eq(job_listings.id, jobId))

    return result
}

export const get_all_job_listings_db = async (filter: filterJobType) => {
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

export const get_job_listings_stages_db = async (jobId: number) => {
    const result = await db.select()
        .from(stages)
        .where(eq(stages.job_id, jobId))

    return result
}

// export const update_job_listing = async (data: Partial<filterJobType>) => {
// }

// export const delete_job_listing = async (data) => {
// }