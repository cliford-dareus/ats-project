import {db} from "@/drizzle/db";
import {and, eq, gte, lt, lte, SQL, sql} from "drizzle-orm";
import {applications, candidates, job_listings} from "@/drizzle/schema";

export const get_job_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(job_listings.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(job_listings.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(job_listings)
            .where(and(...createdAtQuery))
            .groupBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')DESC`);
};

export const get_open_job_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(job_listings.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(job_listings.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(job_listings)
            .where(and(...createdAtQuery, eq(job_listings.status, 'OPEN')))
            .groupBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')DESC`);
};

export const get_application_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {}

export const get_interview_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {}

export const get_candidate_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {}

export const get_hired_candidate_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(candidates.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(candidates.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(candidates)
            .where(and(...createdAtQuery, eq(candidates.status, 'Hired')))
            .groupBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')DESC`);
};