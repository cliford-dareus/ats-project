import {job_listings} from "@/drizzle/schema";
import {db} from "@/drizzle/db";

export const get_all_job_listings = async () => {
    const result = await db.select().from(job_listings)
    return result
}



export const create_job_listing = async (data: typeof job_listings.$inferInsert) => {
    await db.insert(job_listings).values({
        name: data.name,
        location: data.location,
        salary_up_to: data.salary_up_to,
        description: data.description,
        createdBy: data.createdBy,
    })
}