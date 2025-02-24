import {db} from "@/drizzle/db";
import {and, eq, gte, lte, SQL, sql} from "drizzle-orm";
import {applications, candidates, interviews, job_listings} from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getIdTag } from "@/lib/cache";

export const getChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_job_chart_data_db, {
        tags: [
            getIdTag(`chartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

export const getOpenJobChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_open_job_chart_data_db, {
        tags: [
            getIdTag(`openJobChartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

export const getApplicationChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_application_chart_data_db, {
        tags: [
            getIdTag(`applicationChartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

export const getInterviewChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_interview_chart_data_db, {
        tags: [
            getIdTag(`interviewChartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

export const getCandidateChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_candidate_chart_data_db, {
        tags: [
            getIdTag(`candidateChartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

export const getHiredCandidateChartData = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_hired_candidate_chart_data_db, {
        tags: [
            getIdTag(`hiredCandidateChartData-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData)
        ]
    })

    return cacheFn(createdAfter, createdBefore)
};

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
            .orderBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')ASC`);
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
            .orderBy(sql`DATE_FORMAT(${job_listings.created_at},'%Y-%m-%d')ASC`);
};

export const get_application_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(applications.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(applications.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${applications.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(applications)
            .where(and(...createdAtQuery))
            .groupBy(sql`DATE_FORMAT(${applications.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${applications.created_at},'%Y-%m-%d')ASC`);
};

export const get_interview_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(applications.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(applications.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(interviews)
            .where(and(...createdAtQuery, eq(interviews.status, 'SCHEDULE')))
            .groupBy(sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')ASC`);
};

export const get_candidate_chart_data_db = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = []
    if (createdAfter) createdAtQuery.push(gte(candidates.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(candidates.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(candidates)
            .where(and(...createdAtQuery))
            .groupBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')ASC`);
};

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
            .orderBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')ASC`);
};
