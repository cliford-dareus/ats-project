"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import {
    applications,
    candidates,
    job_listings,
    stages,
    interviews
} from "@/drizzle/schema";
import {
    count,
    eq,
    gte,
    lte,
    desc,
    sql,
    and,
    isNull
} from "drizzle-orm";
import { subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { JOB_STAGES } from "@/zod";

// type StageName = typeof stageOrder[number];

export async function getDashboardMetrics() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const startOfThisMonth = startOfMonth(now);
    const startOfLastMonth = startOfMonth(lastMonth);
    const endOfLastMonth = endOfMonth(lastMonth);

    // Current month metrics — every query is scoped to the session org.
    const [
        totalApplicationsResult,
        totalCandidatesResult,
        activeJobsResult,
        hiredThisMonthResult
    ] = await Promise.all([
        db.select({ count: count() }).from(applications)
            .where(and(eq(applications.organization, orgId), isNull(applications.deleted_at))),
        db.select({ count: count() }).from(candidates)
            .where(and(eq(candidates.organization, orgId), isNull(candidates.deleted_at))),
        db.select({ count: count() })
            .from(job_listings)
            .where(and(eq(job_listings.status, 'OPEN'), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at))),
        db.select({ count: count() })
            .from(candidates)
            .where(
                and(
                    eq(candidates.status, 'HIRED'),
                    eq(candidates.organization, orgId),
                    isNull(candidates.deleted_at),
                    gte(candidates.updated_at, startOfThisMonth)
                )
            )
    ]);

    // Last month metrics for trend calculation
    const [
        lastMonthApplicationsResult,
        lastMonthCandidatesResult,
        lastMonthHiredResult
    ] = await Promise.all([
        db.select({ count: count() })
            .from(applications)
            .where(
                and(
                    eq(applications.organization, orgId),
                    isNull(applications.deleted_at),
                    gte(applications.created_at, startOfLastMonth),
                    lte(applications.created_at, endOfLastMonth)
                )
            ),
        db.select({ count: count() })
            .from(candidates)
            .where(
                and(
                    eq(candidates.organization, orgId),
                    isNull(candidates.deleted_at),
                    gte(candidates.created_at, startOfLastMonth),
                    lte(candidates.created_at, endOfLastMonth)
                )
            ),
        db.select({ count: count() })
            .from(candidates)
            .where(
                and(
                    eq(candidates.status, 'HIRED'),
                    eq(candidates.organization, orgId),
                    isNull(candidates.deleted_at),
                    gte(candidates.updated_at, startOfLastMonth),
                    lte(candidates.updated_at, endOfLastMonth)
                )
            )
    ]);

    const totalApplications = totalApplicationsResult[0]?.count || 0;
    const totalCandidates = totalCandidatesResult[0]?.count || 0;
    const activeJobs = activeJobsResult[0]?.count || 0;
    const hiredThisMonth = hiredThisMonthResult[0]?.count || 0;

    const lastMonthApplications = lastMonthApplicationsResult[0]?.count || 0;
    const lastMonthCandidates = lastMonthCandidatesResult[0]?.count || 0;
    const lastMonthHired = lastMonthHiredResult[0]?.count || 0;

    // Calculate trends
    const applicationsTrend = lastMonthApplications > 0
        ? Math.round(((totalApplications - lastMonthApplications) / lastMonthApplications) * 100)
        : 0;
    const candidatesTrend = lastMonthCandidates > 0
        ? Math.round(((totalCandidates - lastMonthCandidates) / lastMonthCandidates) * 100)
        : 0;
    const hiresTrend = lastMonthHired > 0
        ? Math.round(((hiredThisMonth - lastMonthHired) / lastMonthHired) * 100)
        : 0;

    return {
        totalApplications,
        totalCandidates,
        activeJobs,
        hiredThisMonth,
        applicationsTrend,
        candidatesTrend,
        jobsTrend: 0, // Would need historical job data
        hiresTrend
    };
};

export async function getRecentActivity() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const sevenDaysAgo = subDays(new Date(), 7);

    // Get recent applications
    const recentApplications = await db
        .select({
            id: applications.id,
            candidateName: candidates.name,
            jobName: job_listings.name,
            createdAt: applications.created_at,
            type: sql<string>`'application'`
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidate, candidates.id))
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            isNull(candidates.deleted_at),
            isNull(job_listings.deleted_at),
            gte(applications.created_at, sevenDaysAgo)
        ))
        .orderBy(desc(applications.created_at))
        .limit(10);

    // Get recent hires
    const recentHires = await db
        .select({
            id: candidates.id,
            candidateName: candidates.name,
            updatedAt: candidates.updated_at,
            type: sql<string>`'hired'`
        })
        .from(candidates)
        .where(
            and(
                eq(candidates.status, 'HIRED'),
                eq(candidates.organization, orgId),
                isNull(candidates.deleted_at),
                gte(candidates.updated_at, sevenDaysAgo)
            )
        )
        .orderBy(desc(candidates.updated_at))
        .limit(5);

    // Get recent job postings
    const recentJobs = await db
        .select({
            id: job_listings.id,
            jobName: job_listings.name,
            createdAt: job_listings.created_at,
            type: sql<string>`'job_posted'`
        })
        .from(job_listings)
        .where(and(
            eq(job_listings.organization, orgId),
            isNull(job_listings.deleted_at),
            gte(job_listings.created_at, sevenDaysAgo)
        ))
        .orderBy(desc(job_listings.created_at))
        .limit(5);

    // Combine and sort all activities
    const allActivities = [
        ...recentApplications.map(app => ({
            id: `app-${app.id}`,
            type: 'application' as const,
            candidate: app.candidateName,
            job: app.jobName,
            timestamp: app.createdAt
        })),
        ...recentHires.map(hire => ({
            id: `hire-${hire.id}`,
            type: 'hire' as const,
            candidate: hire.candidateName,
            job: undefined,
            timestamp: hire.updatedAt
        })),
        ...recentJobs.map(job => ({
            id: `job-${job.id}`,
            type: 'job_posted' as const,
            candidate: undefined,
            job: job.jobName,
            timestamp: job.createdAt
        }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return allActivities.slice(0, 10);
};

export async function getUpcomingInterviews() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const sevenDaysFromNow = subDays(now, -7);

    const upcomingInterviews = await db
        .select({
            id: interviews.id,
            candidateName: candidates.name,
            jobTitle: job_listings.name,
            startAt: interviews.start_at,
            location: interviews.locations
        })
        .from(interviews)
        .innerJoin(applications, eq(interviews.applications_id, applications.id))
        .innerJoin(candidates, eq(applications.candidate, candidates.id))
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(
            and(
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
                isNull(candidates.deleted_at),
                isNull(job_listings.deleted_at),
                gte(interviews.start_at, now),
                lte(interviews.start_at, sevenDaysFromNow)
            )
        )
        .orderBy(interviews.start_at)
        .limit(10);

    return upcomingInterviews
        .filter(interview => interview.startAt !== null)
        .map(interview => ({
            id: interview.id.toString(),
            candidateName: interview.candidateName,
            jobTitle: interview.jobTitle,
            time: interview.startAt!,
            type: interview.location?.toLowerCase().includes('phone') ? 'phone' as const :
                interview.location?.toLowerCase().includes('video') ? 'video' as const :
                    'in-person' as const
        }));
};

export async function getJobPipelineData() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const jobPipelineData = await db
        .select({
            jobId: job_listings.id,
            jobTitle: job_listings.name,
            stageName: stages.stage_name,
            stageColor: stages.color,
            stageOrder: stages.stage_order_id,
            applicationCount: count(applications.id)
        })
        .from(job_listings)
        .leftJoin(stages, eq(job_listings.id, stages.job_id))
        .leftJoin(applications, and(eq(stages.id, applications.current_stage_id), isNull(applications.deleted_at)))
        .where(and(eq(job_listings.status, 'PENDING'), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .groupBy(job_listings.id, job_listings.name, stages.stage_name, stages.color, stages.stage_order_id)
        .orderBy(job_listings.id, stages.stage_order_id);

    // Group by job and format stages
    const jobsMap = new Map();

    jobPipelineData.forEach(row => {
        if (!jobsMap.has(row.jobId)) {
            jobsMap.set(row.jobId, {
                jobTitle: row.jobTitle,
                totalApplications: 0,
                stages: []
            });
        }

        const job = jobsMap.get(row.jobId);
        if (row.stageName) {
            job.stages.push({
                name: row.stageName,
                count: row.applicationCount || 0,
                color: row.stageColor || '#6b7280'
            });
            job.totalApplications += row.applicationCount || 0;
        }
    });

    return Array.from(jobsMap.values()).slice(0, 5);
};

export async function getApplicationTrends() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const thirtyDaysAgo = subDays(new Date(), 1030);

    const applicationTrends = await db
        .select({
            date: sql<string>`DATE(${applications.created_at})`,
            count: count(applications.id)
        })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, thirtyDaysAgo)
        ))
        .groupBy(sql`DATE(${applications.created_at})`)
        .orderBy(sql`DATE(${applications.created_at})`);

    return applicationTrends.map(trend => ({
        date: trend.date,
        count: trend.count
    }));
};

export async function getHiringTrends() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const thirtyDaysAgo = subDays(new Date(), 30);

    const hiringTrends = await db
        .select({
            date: sql<string>`DATE(${candidates.updated_at})`,
            count: count(candidates.id)
        })
        .from(candidates)
        .where(
            and(
                eq(candidates.status, 'HIRED'),
                eq(candidates.organization, orgId),
                isNull(candidates.deleted_at),
                gte(candidates.updated_at, thirtyDaysAgo)
            )
        )
        .groupBy(sql`DATE(${candidates.updated_at})`)
        .orderBy(sql`DATE(${candidates.updated_at})`);

    return hiringTrends.map(trend => ({
        date: trend.date,
        count: trend.count
    }));
};

export async function getTopPerformingJobs() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const topJobs = await db
        .select({
            jobId: job_listings.id,
            jobTitle: job_listings.name,
            applicationCount: count(applications.id),
            hiredCount: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'HIRED' THEN 1 END)`,
            conversionRate: sql<number>`ROUND((COUNT(CASE WHEN ${candidates.status} = 'HIRED' THEN 1 END) * 100.0 / COUNT(${applications.id})), 2)`
        })
        .from(job_listings)
        .leftJoin(applications, and(eq(job_listings.id, applications.job_id), isNull(applications.deleted_at)))
        .leftJoin(candidates, and(eq(applications.candidate, candidates.id), isNull(candidates.deleted_at)))
        .where(and(eq(job_listings.status, 'OPEN'), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .groupBy(job_listings.id, job_listings.name)
        .orderBy(desc(count(applications.id)))
        .limit(10);

    return topJobs.map(job => ({
        jobId: job.jobId,
        jobTitle: job.jobTitle,
        applicationCount: job.applicationCount,
        hiredCount: job.hiredCount || 0,
        conversionRate: job.conversionRate || 0
    }));
};

export async function getInterviewScheduleData() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const thirtyDaysFromNow = subDays(now, -30);

    const interviewSchedule = await db
        .select({
            date: sql<string>`DATE(${interviews.start_at})`,
            count: count(interviews.id),
            status: interviews.status,
            location: interviews.locations
        })
        .from(interviews)
        .leftJoin(applications, eq(applications.id, interviews.applications_id))
        .where(
            and(
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
                gte(interviews.start_at, now),
                lte(interviews.start_at, thirtyDaysFromNow)
            )
        )
        .groupBy(sql`DATE(${interviews.start_at})`, interviews.status, interviews.locations)
        .orderBy(sql`DATE(${interviews.start_at})`);

    return interviewSchedule.map(schedule => ({
        date: schedule.date,
        count: schedule.count,
        status: schedule.status,
        location: schedule.location,
        type: schedule.location?.toLowerCase().includes('phone') ? 'phone' :
            schedule.location?.toLowerCase().includes('video') ? 'video' : 'in-person'
    }));
};

export async function getCandidateStatusDistribution() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const statusDistribution = await db
        .select({
            status: candidates.status,
            count: count(candidates.id)
        })
        .from(candidates)
        .where(and(eq(candidates.organization, orgId), isNull(candidates.deleted_at)))
        .groupBy(candidates.status)
        .orderBy(desc(count(candidates.id)));

    return statusDistribution.map(status => ({
        status: status.status,
        count: status.count
    }));
};

export async function getRecruitmentFunnel() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // stages has no org column — scope via its job (job_id is NOT NULL, so an
    // inner join is safe).
    const funnelData = await db
        .select({
            stageName: stages.stage_name,
            stageColor: stages.color,
            stageOrder: stages.stage_order_id,
            count: count(applications.id)
        })
        .from(stages)
        .innerJoin(job_listings, eq(stages.job_id, job_listings.id))
        .leftJoin(applications, and(eq(stages.id, applications.current_stage_id), isNull(applications.deleted_at)))
        .where(and(eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .groupBy(stages.stage_name, stages.stage_order_id, stages.color)
        .orderBy(stages.stage_order_id);

    const aggregated = funnelData.reduce((acc, item, index) => {
        const stage = item.stageName!;

        if (!acc[stage]) {
            acc[stage] = {
                stage,
                stageColor: item.stageColor!,
                count: 0,
                conversion: 0
            };
        }

        acc[stage].count += item.count;

        if (Math.round((item.count / funnelData[index].count) * 100) > acc[stage].conversion) {
            acc[stage].conversion = Math.round((item.count / funnelData[index].count) * 100);
        }

        return acc;
    }, {} as Record<string, { stage: string; count: number; stageColor: string; conversion: number }>);

    const stageOrder = [
        "Applied",
        "New Candidate",
        "Screening",
        "Phone Interview",
        "Interview",
        "Offer",
        "Hired",
        "Drafted"
    ];

    return stageOrder
        .map(stage => aggregated[stage] ?? {
            stage: stage, count: 0, conversion: 0
        })
        .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)) as
        { stage: typeof JOB_STAGES._type; count: number; conversion: number; stageColor: string }[]
};

/**
 * Days from first application to hire for every HIRED candidate in the org.
 * Hire time is candidates.updated_at (the flip to HIRED updates it) — the
 * same proxy getDashboardMetrics/getHiringTrends already use. Returns []
 * when nobody has been hired yet; callers handle the empty case rather than
 * inventing a number.
 */
async function get_hire_durations_days(orgId: string): Promise<number[]> {
    const hires = await db
        .select({
            applied_at: sql<Date>`MIN(${applications.created_at})`,
            hired_at: candidates.updated_at,
        })
        .from(candidates)
        .innerJoin(applications, eq(applications.candidate, candidates.id))
        .where(
            and(
                eq(candidates.status, "HIRED"),
                eq(candidates.organization, orgId),
                isNull(candidates.deleted_at),
                eq(applications.organization, orgId),
                isNull(applications.deleted_at)
            )
        )
        .groupBy(candidates.id, candidates.updated_at);

    return hires
        .map((hire) => {
            if (!hire.applied_at || !hire.hired_at) return null;
            const days =
                (new Date(hire.hired_at).getTime() -
                    new Date(hire.applied_at).getTime()) /
                (1000 * 60 * 60 * 24);
            return days >= 0 ? days : null;
        })
        .filter((days): days is number => days !== null);
}

export async function getTimeToHireMetrics() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const durations = await get_hire_durations_days(orgId);

    const buckets = [
        { range: '0-7 days', count: 0 },
        { range: '8-14 days', count: 0 },
        { range: '15-21 days', count: 0 },
        { range: '22-30 days', count: 0 },
        { range: '31+ days', count: 0 }
    ];

    for (const days of durations) {
        if (days <= 7) buckets[0].count++;
        else if (days <= 14) buckets[1].count++;
        else if (days <= 21) buckets[2].count++;
        else if (days <= 30) buckets[3].count++;
        else buckets[4].count++;
    }

    return buckets;
};

export async function getAllDashboardData() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    try {
        const [
            metrics,
            recentActivity,
            upcomingInterviews,
            jobPipeline,
            applicationTrends,
            hiringTrends,
            topJobs,
            candidateDistribution,
            recruitmentFunnel
        ] = await Promise.all([
            getDashboardMetrics(),
            getRecentActivity(),
            getUpcomingInterviews(),
            getJobPipelineData(),
            getApplicationTrends(),
            getHiringTrends(),
            getTopPerformingJobs(),
            getCandidateStatusDistribution(),
            getRecruitmentFunnel()
        ]);

        return {
            metrics,
            recentActivity,
            upcomingInterviews,
            jobPipeline,
            analytics: {
                applicationTrends,
                hiringTrends,
                topJobs,
                candidateDistribution,
                recruitmentFunnel
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw new Error('Failed to fetch dashboard data');
    }
};

export async function getPerformanceMetrics() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    // Calculate various performance metrics
    const [
        totalApplicationsResult,
        totalInterviewsResult,
        totalHiresResult,
        avgTimeToHireResult
    ] = await Promise.all([
        db.select({ count: count() })
            .from(applications)
            .where(and(
                eq(applications.organization, orgId),
                isNull(applications.deleted_at),
                gte(applications.created_at, thirtyDaysAgo)
            )),

        db.select({ count: count() })
            .from(interviews)
            .leftJoin(applications, eq(applications.id, interviews.applications_id))
            .where(and(
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
                gte(interviews.created_at, thirtyDaysAgo)
            )),

        db.select({ count: count() })
            .from(candidates)
            .where(
                and(
                    eq(candidates.status, 'HIRED'),
                    eq(candidates.organization, orgId),
                    isNull(candidates.deleted_at),
                    gte(candidates.updated_at, thirtyDaysAgo)
                )
            ),

        // Real average time to hire: first application to HIRED status,
        // same data as getTimeToHireMetrics. 0 when nobody has been hired yet.
        get_hire_durations_days(orgId).then((durations) => [{
            avgDays: durations.length > 0
                ? Math.round((durations.reduce((sum, days) => sum + days, 0) / durations.length) * 10) / 10
                : 0
        }])
    ]);

    const totalApplications = totalApplicationsResult[0]?.count || 0;
    const totalInterviews = totalInterviewsResult[0]?.count || 0;
    const totalHires = totalHiresResult[0]?.count || 0;
    const avgTimeToHire = avgTimeToHireResult[0]?.avgDays || 0;

    // Calculate conversion rates
    const applicationToInterviewRate = totalApplications > 0
        ? Math.round((totalInterviews / totalApplications) * 100)
        : 0;

    const interviewToHireRate = totalInterviews > 0
        ? Math.round((totalHires / totalInterviews) * 100)
        : 0;

    const offerAcceptanceRate = 87.2; // Mock data - would need offer tracking
    const costPerHire = 3250; // Mock data - would need cost tracking
    const qualityOfHire = 4.2; // Mock data - would need performance tracking

    return {
        totalApplications,
        totalInterviews,
        totalHires,
        avgTimeToHire,
        applicationToInterviewRate,
        interviewToHireRate,
        offerAcceptanceRate,
        costPerHire,
        qualityOfHire,
        period: '30 days'
    };
};

export async function getQuickStats() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const today = new Date();
    const yesterday = subDays(today, 1);
    const thisWeek = subDays(today, 7);

    const [
        todayApplications,
        yesterdayApplications,
        thisWeekApplications,
        todayInterviews,
        pendingOffers
    ] = await Promise.all([
        db.select({ count: count() })
            .from(applications)
            .where(
                and(
                    eq(applications.organization, orgId),
                    isNull(applications.deleted_at),
                    gte(applications.created_at, new Date(today.getFullYear(), today.getMonth(), today.getDate())),
                    lte(applications.created_at, today)
                )
            ),

        db.select({ count: count() })
            .from(applications)
            .where(
                and(
                    eq(applications.organization, orgId),
                    isNull(applications.deleted_at),
                    gte(applications.created_at, new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())),
                    lte(applications.created_at, yesterday)
                )
            ),

        db.select({ count: count() })
            .from(applications)
            .where(and(
                eq(applications.organization, orgId),
                isNull(applications.deleted_at),
                gte(applications.created_at, thisWeek)
            )),

        db.select({ count: count() })
            .from(interviews)
            .leftJoin(applications, eq(applications.id, interviews.applications_id))
            .where(
                and(
                    eq(interviews.organization, orgId),
                    isNull(applications.deleted_at),
                    gte(interviews.start_at, new Date(today.getFullYear(), today.getMonth(), today.getDate())),
                    lte(interviews.start_at, today)
                )
            ),

        // Mock pending offers - would need offer tracking
        Promise.resolve([{ count: 8 }])
    ]);

    return {
        todayApplications: todayApplications[0]?.count || 0,
        yesterdayApplications: yesterdayApplications[0]?.count || 0,
        thisWeekApplications: thisWeekApplications[0]?.count || 0,
        todayInterviews: todayInterviews[0]?.count || 0,
        pendingOffers: pendingOffers[0]?.count || 0,
        applicationsTrend: yesterdayApplications[0]?.count
            ? Math.round(((todayApplications[0]?.count || 0) - (yesterdayApplications[0]?.count || 0)) / (yesterdayApplications[0]?.count || 1) * 100)
            : 0
    };
};

export async function getAlerts() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const tomorrow = subDays(now, -1);

    // Get interviews that need attention
    const upcomingInterviews = await db
        .select({
            id: interviews.id,
            candidateName: candidates.name,
            jobTitle: job_listings.name,
            startAt: interviews.start_at,
            status: interviews.status
        })
        .from(interviews)
        .innerJoin(applications, eq(interviews.applications_id, applications.id))
        .innerJoin(candidates, eq(applications.candidate, candidates.id))
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(
            and(
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
                isNull(candidates.deleted_at),
                isNull(job_listings.deleted_at),
                gte(interviews.start_at, now),
                lte(interviews.start_at, tomorrow),
                eq(interviews.status, 'SCHEDULE')
            )
        )
        .limit(5);

    // Mock other alerts
    const alerts = [
        ...upcomingInterviews.map(interview => ({
            id: `interview-${interview.id}`,
            type: 'interview' as const,
            priority: 'high' as const,
            title: 'Interview Tomorrow',
            message: `Interview with ${interview.candidateName} for ${interview.jobTitle}`,
            timestamp: interview.startAt,
            actionRequired: true
        })),
        {
            id: 'applications-pending',
            type: 'application' as const,
            priority: 'medium' as const,
            title: 'Applications Need Review',
            message: '12 new applications require screening',
            timestamp: new Date(),
            actionRequired: true
        },
        {
            id: 'offers-expiring',
            type: 'offer' as const,
            priority: 'high' as const,
            title: 'Offers Expiring Soon',
            message: '3 job offers expire within 48 hours',
            timestamp: new Date(),
            actionRequired: true
        }
    ];

    return alerts.slice(0, 10);
};
