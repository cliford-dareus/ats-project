import {
    applications,
    candidates,
    job_listings,
    job_technologies,
    stages,
    technologies,
    triggers
} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, inArray, sql, SQL} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag, getIdTag, revalidateDbCache} from "@/lib/cache";
import {z} from "zod";
import {filterJobType, formSchema} from "@/zod";

interface FilterInterface extends z.infer<typeof filterJobType> {
    organization: string;
}

export const create_job_listing = async (data: z.infer<typeof formSchema> & {
    userId: string | null,
}) => {
    return await db.transaction(async (trx) => {
        const [inserted_job] = await trx.insert(job_listings).values({
            name: data.jobInfo.job_name,
            location: data.jobInfo.job_location,
            salary_up_to: data.jobInfo.salary_up_to,
            description: data.jobInfo.job_description,
            createdBy: data.userId!,
            department: Number(data.jobInfo.department),
            organization: data.jobInfo.organization,
        }).$returningId();

        if (!inserted_job) {
            trx.rollback()
        }

        const techs = await trx.insert(technologies).values(
            data.jobTechnology.map((item) => ({
                name: item.technology,
                years_experience: Number(item.year_of_experience),
            }))
        ).$returningId();

        for (const tech of techs) {
            await trx.insert(job_technologies).values({
                id: tech.id * 2,
                job_id: inserted_job.id,
                technology_id: tech.id
            })
        }

        await trx.insert(stages).values(
            data.jobStages.map((item, i) => ({
                job_id: inserted_job.id,
                stage_name: item.stage_name,
                stage_order_id: i,
                assign_to: 'sss',
                need_schedule: item.need_schedule,
                color: item.color,
            }))
        );

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            // userId: newProduct.userId,
            id: String(inserted_job.id),
        });

        return inserted_job
    })
};

export const get_job_listings_stages = (jobId: number) => {
    const cacheFn = dbCache(get_job_listings_stages_db, {
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.stages)
        ]
    })

    return cacheFn(jobId)
};

export const get_all_job_listings = (filter: FilterInterface) => {
    const cacheFn = dbCache(get_all_job_listings_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.jobs)
        ]
    })
    return cacheFn(filter);
};

export const get_job_by_id = (jobId: number) => {
    const cacheFn = dbCache(get_job_by_id_db, {
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.jobs)
        ]
    })
    return cacheFn(jobId)
};

export const get_job_listing_with_candidate = async (jobId: number) => {
    return await db
        .select({
            job_id: job_listings.id,
            job_name: job_listings.name,
            job_location: job_listings.location,
            job_status: job_listings.status,
            job_created_at: job_listings.created_at,
            job_updated_at: job_listings.updated_at,
            job_createdBy: job_listings.createdBy,
            application_id: applications.id,
            application_updated_at: applications.updated_at,
            stageName: stages.stage_name,
            stage_order_id: stages.stage_order_id,
            candidate_name: candidates.name,
            candidate_id: candidates.id,
        })
        .from(job_listings)
        .leftJoin(applications, eq(applications.job_id, job_listings.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .leftJoin(candidates, eq(candidates.id, applications.candidate))
        .where(eq(job_listings.id, jobId))
};

export const get_all_job_listings_db = async (filter: FilterInterface) => {
    const filters: SQL[] = []

    if (filter.location) filters.push(inArray(job_listings.location, filter.location as string[]))
    // if(filter.department) filters.push(inArray(job_listings.department, filter.department as string[]))
    // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
    // if(filter.status) filters.push(eq(job_listings.status, filter.status))

    const jobListings = await db.select({
        id: job_listings.id,
        name: job_listings.name,
        location: job_listings.location,
        status: job_listings.status,
        department: job_listings.department,
        organization: job_listings.organization,
        created_at: job_listings.created_at,
        updated_at: job_listings.updated_at,
        createdBy: job_listings.createdBy,
        candidatesCount: db.$count(applications, eq(applications.job_id, job_listings.id))
    })
        .from(job_listings)
        .where(and(...filters, eq(job_listings.organization, filter.organization)))
        .limit(filter.limit!)
        .offset(filter.offset!)

    const len = jobListings.length
    return [len, jobListings];
};

export const get_job_listings_stages_db = async (jobId: number) => {
    return await db.select({
        id: stages.id,
        assign_to: stages.assign_to,
        color: stages.color,
        job_id: stages.job_id,
        need_schedule: stages.need_schedule,
        stage_name: stages.stage_name,
        stage_order_id: stages.stage_order_id,
        trigger: sql<string>`COALESCE(JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', ${triggers.id},'action_type', ${triggers.action_type},'config', ${triggers.config})
                ), '[]')`.as('trigger')
    })
        .from(stages)
        .leftJoin(triggers, eq(triggers.stage_id, stages.id))
        .where(eq(stages.job_id, jobId))
        .groupBy(stages.id)
};

export const get_job_by_id_db = async (jobId: number) => {
    const [job] = await db.select().from(job_listings).where(eq(job_listings.id, jobId));
    return job
};

// export const update_job_listing = async (data: Partial<filterJobType>) => {
// }

// export const delete_job_listing = async (data) => {
// }