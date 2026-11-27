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
    lt,
    lte,
    sql,
    and,
    isNull,
    notInArray
} from "drizzle-orm";
import { subDays, addDays, subMonths, startOfDay, startOfMonth, endOfMonth } from "date-fns";
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

    // Current totals + this month's counts — every query is scoped to the
    // session org. Trends compare this month against last month (both
    // same-window counts); comparing an all-time total against one month
    // would inflate the trend.
    const [
        totalApplicationsResult,
        totalCandidatesResult,
        activeJobsResult,
        hiredThisMonthResult,
        thisMonthApplicationsResult,
        thisMonthCandidatesResult
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
            ),
        db.select({ count: count() })
            .from(applications)
            .where(
                and(
                    eq(applications.organization, orgId),
                    isNull(applications.deleted_at),
                    gte(applications.created_at, startOfThisMonth)
                )
            ),
        db.select({ count: count() })
            .from(candidates)
            .where(
                and(
                    eq(candidates.organization, orgId),
                    isNull(candidates.deleted_at),
                    gte(candidates.created_at, startOfThisMonth)
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

    const thisMonthApplications = thisMonthApplicationsResult[0]?.count || 0;
    const thisMonthCandidates = thisMonthCandidatesResult[0]?.count || 0;
    const lastMonthApplications = lastMonthApplicationsResult[0]?.count || 0;
    const lastMonthCandidates = lastMonthCandidatesResult[0]?.count || 0;
    const lastMonthHired = lastMonthHiredResult[0]?.count || 0;

    // Month-over-month trends. Growth from zero last month reads as +100%
    // rather than 0 — 0% would claim nothing changed.
    const month_over_month = (thisMonth: number, lastMonth: number) =>
        lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
            : thisMonth > 0 ? 100 : 0;

    return {
        totalApplications,
        totalCandidates,
        activeJobs,
        hiredThisMonth,
        applicationsTrend: month_over_month(thisMonthApplications, lastMonthApplications),
        candidatesTrend: month_over_month(thisMonthCandidates, lastMonthCandidates),
        // No jobs trend: there is no historical snapshot of the OPEN count,
        // so any number here would be invented. The card renders without a
        // trend badge instead of showing a fake 0%.
        jobsTrend: null as number | null,
        hiresTrend: month_over_month(hiredThisMonth, lastMonthHired)
    };
};

export async function getUpcomingInterviews() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const sevenDaysFromNow = subDays(now, -7);

    const upcomingInterviews = await db
        .select({
            id: interviews.id,
            applicationId: applications.id,
            candidateName: candidates.name,
            jobTitle: job_listings.name,
            startAt: interviews.start_at,
            // The interview's own type column — the old code guessed from
            // the locations string, which mislabels video/phone interviews.
            type: interviews.type
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
            applicationId: interview.applicationId,
            candidateName: interview.candidateName,
            jobTitle: interview.jobTitle,
            time: interview.startAt!,
            type: interview.type === 'PHONE' ? 'phone' as const :
                interview.type === 'VIDEO' ? 'video' as const :
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
        .where(and(eq(job_listings.status, 'OPEN'), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .groupBy(job_listings.id, job_listings.name, stages.stage_name, stages.color, stages.stage_order_id)
        .orderBy(job_listings.id, stages.stage_order_id);

    // Group by job and format stages
    const jobsMap = new Map();

    jobPipelineData.forEach(row => {
        if (!jobsMap.has(row.jobId)) {
            jobsMap.set(row.jobId, {
                jobId: row.jobId,
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

export type TrendRange = '7d' | '30d';

export const parse_trend_range = (value: string | undefined): TrendRange =>
    value === '30d' ? '30d' : '7d';

/**
 * Daily application counts for the last 7 or 30 days, zero-filled so days
 * with no applications still show on the chart. Previously this read
 * `subDays(now, 1030)` — three years of history — under a "Last 7 Days"
 * label.
 */
export async function getApplicationTrends(range: TrendRange = '7d') {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const days = range === '30d' ? 30 : 7;
    const startDate = subDays(startOfDay(new Date()), days - 1);

    const applicationTrends = await db
        .select({
            date: sql<string>`DATE(${applications.created_at})`,
            count: count(applications.id)
        })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, startDate)
        ))
        .groupBy(sql`DATE(${applications.created_at})`)
        .orderBy(sql`DATE(${applications.created_at})`);

    const byDate = new Map(applicationTrends.map(trend => [trend.date, trend.count]));
    const out: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const key = date.toISOString().slice(0, 10);
        out.push({ date: key, count: byDate.get(key) ?? 0 });
    }
    return out;
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

    // "Conversion" is the stage's share of all applications. The old code
    // divided each row by itself (item.count / funnelData[index].count),
    // which read 100% for every stage with at least one application.
    const total = funnelData.reduce((sum, item) => sum + item.count, 0);
    const aggregated = funnelData.reduce((acc, item) => {
        const stage = item.stageName!;

        if (!acc[stage]) {
            acc[stage] = {
                stage,
                stageColor: item.stageColor ?? '#6b7280',
                count: 0,
                conversion: 0
            };
        }

        acc[stage].count += item.count;
        acc[stage].stageColor = item.stageColor ?? acc[stage].stageColor;
        return acc;
    }, {} as Record<string, { stage: string; count: number; stageColor: string; conversion: number }>);

    for (const entry of Object.values(aggregated)) {
        entry.conversion = total > 0 ? Math.round((entry.count / total) * 100) : 0;
    }

    // Exactly the JOB_STAGES values, Applied first. "Hired" is not a stage
    // (hiring is a candidate status), so it no longer renders as a
    // permanent zero slice; create_stage_action validates against
    // JOB_STAGES, so no custom stage name can appear here.
    const stageOrder = [
        "Applied",
        "New Candidate",
        "Screening",
        "Phone Interview",
        "Interview",
        "Offer",
        "Drafted"
    ];

    return stageOrder
        .map(stage => aggregated[stage] ?? {
            stage: stage, count: 0, conversion: 0, stageColor: '#6b7280'
        })
        .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)) as
        { stage: typeof JOB_STAGES._type; count: number; conversion: number; stageColor: string }[]
};

/**
 * Days from first application to hire for every HIRED candidate in the org.
 * Hire time is candidates.updated_at (the flip to HIRED updates it) — the
 * same proxy getDashboardMetrics already uses. Returns []
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


export type AttentionStats = {
    interviewsToday: number;
    awaitingFeedback: number;
    pendingHolds: number;
    draftJobs: number;
    jobsByStatus: Record<string, number>;
    timeToHire: {
        avgDays: number | null;
        hires: number;
        buckets: { range: string; count: number }[];
    };
};

/**
 * The "needs attention" numbers for the dashboard. Every count is real,
 * org-scoped, and excludes soft-deleted rows. Anything that cannot be
 * computed honestly from stored data is not here: offer acceptance rate,
 * cost per hire, and quality of hire have no source data (the old
 * dashboard-actions returned mock 87.2 / $3250 / 4.2 for those), and
 * pending offers do not exist as records.
 */
export async function getAttentionStats(): Promise<AttentionStats> {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const startOfToday = startOfDay(now);
    const startOfTomorrow = startOfDay(addDays(now, 1));

    // A dead hold never became an interview — DECLINED / EXPIRED /
    // RELEASED holds are not today's interviews and are not awaiting
    // feedback. CANCELLED interviews are already excluded by status.
    const liveHold = notInArray(interviews.hold_status, ["DECLINED", "EXPIRED", "RELEASED"]);

    const [
        interviewsTodayResult,
        awaitingFeedbackResult,
        pendingHoldsResult,
        draftJobsResult,
        jobsByStatusRows,
        durations
    ] = await Promise.all([
        db.select({ count: count() })
            .from(interviews)
            .innerJoin(applications, eq(interviews.applications_id, applications.id))
            .where(and(
                eq(interviews.organization, orgId),
                eq(interviews.status, 'SCHEDULE'),
                liveHold,
                isNull(applications.deleted_at),
                gte(interviews.start_at, startOfToday),
                lt(interviews.start_at, startOfTomorrow)
            )),
        // Same derivation as is_interview_awaiting_feedback in
        // src/lib/interview-status.ts: stored SCHEDULE with the scheduled
        // time passed. Feedback submission flips the row to COMPLETE, so
        // no scorecard check is needed.
        db.select({ count: count() })
            .from(interviews)
            .innerJoin(applications, eq(interviews.applications_id, applications.id))
            .where(and(
                eq(interviews.organization, orgId),
                eq(interviews.status, 'SCHEDULE'),
                liveHold,
                isNull(applications.deleted_at),
                lt(interviews.end_at, now)
            )),
        db.select({ count: count() })
            .from(interviews)
            .where(and(
                eq(interviews.organization, orgId),
                eq(interviews.hold_status, 'TENTATIVE'),
                gte(interviews.hold_expires_at, now)
            )),
        db.select({ count: count() })
            .from(job_listings)
            .where(and(
                eq(job_listings.organization, orgId),
                eq(job_listings.status, 'DRAFT'),
                isNull(job_listings.deleted_at)
            )),
        db.select({ status: job_listings.status, count: count() })
            .from(job_listings)
            .where(and(
                eq(job_listings.organization, orgId),
                isNull(job_listings.deleted_at)
            ))
            .groupBy(job_listings.status),
        get_hire_durations_days(orgId)
    ]);

    const jobsByStatus: Record<string, number> = {
        OPEN: 0,
        DRAFT: 0,
        PENDING: 0,
        CLOSED: 0,
        ARCHIVED: 0
    };
    for (const row of jobsByStatusRows) {
        if (row.status) jobsByStatus[row.status] = row.count;
    }

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

    return {
        interviewsToday: interviewsTodayResult[0]?.count || 0,
        awaitingFeedback: awaitingFeedbackResult[0]?.count || 0,
        pendingHolds: pendingHoldsResult[0]?.count || 0,
        draftJobs: draftJobsResult[0]?.count || 0,
        jobsByStatus,
        timeToHire: {
            avgDays: durations.length > 0
                ? Math.round((durations.reduce((sum, days) => sum + days, 0) / durations.length) * 10) / 10
                : null,
            hires: durations.length,
            buckets
        }
    };
};
