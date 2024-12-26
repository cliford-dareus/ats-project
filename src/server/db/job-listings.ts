import {candidates, job_listings, stages} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, inArray, or, sql} from "drizzle-orm";

type filterJobType = {
    location?: string | string[]
    keywords?: string[]
    department?: string[]
    limit: number
    offset: number
};

export const get_all_job_listings = async (filter: filterJobType) => {
    console.log("filter job listings", filter.limit, filter.offset);
    const jobListings = await db.select()
        .from(job_listings)
        .where(and(
            (filter.location?.length !== undefined ? (inArray(job_listings.location, filter.location as string[])) : undefined),
            // inArray(job_listings.department, filter.department ?? []),
            // inArray(job_listings.keywords, filter.keywords ?? []),
        ))
        .limit(filter.limit)
        .offset(filter.offset)

    const len = jobListings.length
    return [len, jobListings];
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