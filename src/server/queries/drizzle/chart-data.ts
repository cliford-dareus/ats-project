import {db} from "@/drizzle/db";
import {and, eq, gte, lte, SQL, sql} from "drizzle-orm";
import {applications, candidates, interviews, job_listings} from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getIdTag, getOrgTag } from "@/lib/cache";

// NOTE: every query here is org-scoped. The orgId comes from the caller's
// Clerk session (never from the client) and is part of both the WHERE clause
// and the cache tags, so one org can never read another org's cached charts.

export const getChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_job_chart_data_db, {
        tags: [
            getIdTag(`chartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const getOpenJobChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_open_job_chart_data_db, {
        tags: [
            getIdTag(`openJobChartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const getApplicationChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_application_chart_data_db, {
        tags: [
            getIdTag(`applicationChartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const getInterviewChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_interview_chart_data_db, {
        tags: [
            getIdTag(`interviewChartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const getCandidateChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_candidate_chart_data_db, {
        tags: [
            getIdTag(`candidateChartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const getHiredCandidateChartData = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const cacheFn = dbCache(get_hired_candidate_chart_data_db, {
        tags: [
            getIdTag(`hiredCandidateChartData-${orgId}-${createdAfter}-${createdBefore}`, CACHE_TAGS.chartData),
            getOrgTag(orgId, CACHE_TAGS.chartData),
        ]
    })

    return cacheFn(orgId, createdAfter, createdBefore)
};

export const get_job_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = [eq(job_listings.organization, orgId)]
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

export const get_open_job_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = [eq(job_listings.organization, orgId)]
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

export const get_application_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = [eq(applications.organization, orgId)]
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

export const get_interview_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    // NOTE: previously filtered on applications.created_at while querying the
    // interviews table (no applications table in FROM) — fixed to interviews.
    const createdAtQuery: SQL[] = [eq(interviews.organization, orgId)]
    if (createdAfter) createdAtQuery.push(gte(interviews.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(interviews.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(interviews)
            .where(and(...createdAtQuery, eq(interviews.status, 'SCHEDULE')))
            .groupBy(sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${interviews.created_at},'%Y-%m-%d')ASC`);
};

export const get_candidate_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = [eq(candidates.organization, orgId)]
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

export const get_hired_candidate_chart_data_db = async (orgId: string, createdAfter: Date | null, createdBefore: Date | null) => {
    const createdAtQuery: SQL[] = [eq(candidates.organization, orgId)]
    if (createdAfter) createdAtQuery.push(gte(candidates.created_at, createdAfter))
    if (createdBefore) createdAtQuery.push(lte(candidates.created_at, createdBefore))

    return await db.select({
        date: sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`.as('date'),
        count: sql`COUNT(*)`.as('count'),})
            .from(candidates)
            // NOTE: was 'Hired' — the enum value is 'HIRED', so this always returned 0.
            .where(and(...createdAtQuery, eq(candidates.status, 'HIRED')))
            .groupBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')`)
            .orderBy(sql`DATE_FORMAT(${candidates.created_at},'%Y-%m-%d')ASC`);
};
