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
    avg,
    sum
} from "drizzle-orm";
import { subDays, subMonths } from "date-fns";

export async function getReportData() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const now = new Date();
    const last30Days = subDays(now, 30);
    const last12Months = subMonths(now, 12);

    // Get basic metrics
    const [
        totalApplications,
        totalCandidates,
        totalJobs,
        totalInterviews,
        hiredCandidates,
    ] = await Promise.all([
        db.select({ count: count() })
            .from(applications)
            .where(eq(applications.organization, orgId)),
        db.select({ count: count() })
            .from(candidates)
            .where(eq(candidates.organization, orgId)),
        db.select({ count: count() })
            .from(job_listings)
            .where(eq(job_listings.organization, orgId)),
        db.select({ count: count() })
            .from(interviews)
            .where(eq(interviews.organization, orgId)),
        db.select({ count: count() })
            .from(candidates)
            .where(and(eq(candidates.organization, orgId), eq(candidates.status, 'HIRED'))),
    ]);

    // Get applications by date for trend analysis
    const applicationsByDate = await db
        .select({
            date: sql<string>`DATE(${applications.created_at})`,
            count: count(),
        })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            gte(applications.created_at, last30Days)
        ))
        .groupBy(sql`DATE(${applications.created_at})`)
        .orderBy(sql`DATE(${applications.created_at})`);

    // Get applications by job
    const applicationsByJob = await db
        .select({
            jobTitle: job_listings.name,
            jobId: job_listings.id,
            count: count(applications.id),
        })
        .from(applications)
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(eq(applications.organization, orgId))
        .groupBy(job_listings.id, job_listings.name)
        .orderBy(desc(count(applications.id)))
        .limit(10);

    // Get applications by stage
    const applicationsByStage = await db
        .select({
            stageId: stages.id,
            stageName: stages.stage_name,
            stageOrder: stages.stage_order_id,
            stageColor: stages.color,
            count: count(applications.id),
        })
        .from(stages)
        .innerJoin(job_listings, eq(stages.job_id, job_listings.id))
        .leftJoin(applications, and(
            eq(applications.current_stage_id, stages.id),
            eq(applications.organization, orgId)
        ))
        .where(eq(job_listings.organization, orgId))
        .groupBy(stages.id, stages.stage_name, stages.stage_order_id, stages.color)
        .orderBy(stages.stage_order_id, stages.id);

    // ── Monthly trends (last 12 months): applications, interviews, hires ────
    const monthlyApplications = await db
        .select({
            month: sql<string>`DATE_FORMAT(${applications.created_at}, '%Y-%m')`,
            count: count(applications.id),
        })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            gte(applications.created_at, last12Months)
        ))
        .groupBy(sql`DATE_FORMAT(${applications.created_at}, '%Y-%m')`);

    const monthlyInterviews = await db
        .select({
            month: sql<string>`DATE_FORMAT(${interviews.created_at}, '%Y-%m')`,
            count: count(interviews.id),
        })
        .from(interviews)
        .where(and(
            eq(interviews.organization, orgId),
            gte(interviews.created_at, last12Months)
        ))
        .groupBy(sql`DATE_FORMAT(${interviews.created_at}, '%Y-%m')`);

    // Uses candidates.updated_at as the "hired" timestamp, since that's the
    // last time the status field (including a flip to HIRED) changed. If a
    // hired candidate is later edited for an unrelated reason this would
    // drift, but there's no dedicated hired_at column in the schema.
    // TODO: add a hired_at column to the candidates schema
    const monthlyHires = await db
        .select({
            month: sql<string>`DATE_FORMAT(${candidates.updated_at}, '%Y-%m')`,
            count: count(candidates.id),
        })
        .from(candidates)
        .where(and(
            eq(candidates.organization, orgId),
            eq(candidates.status, 'HIRED'),
            gte(candidates.updated_at, last12Months)
        ))
        .groupBy(sql`DATE_FORMAT(${candidates.updated_at}, '%Y-%m')`);

    const monthlyTrendsMap = new Map<string, { month: string; applications: number; interviews: number; hires: number }>();
    const ensureMonth = (month: string) => {
        if (!monthlyTrendsMap.has(month)) {
            monthlyTrendsMap.set(month, { month, applications: 0, interviews: 0, hires: 0 });
        }
        return monthlyTrendsMap.get(month)!;
    };
    monthlyApplications.forEach((row) => { ensureMonth(row.month).applications = row.count; });
    monthlyInterviews.forEach((row) => { ensureMonth(row.month).interviews = row.count; });
    monthlyHires.forEach((row) => { ensureMonth(row.month).hires = row.count; });

    const monthlyTrends = Array.from(monthlyTrendsMap.values()).sort((a, b) => a.month.localeCompare(b.month));


    // Get source analysis (mock data for now)
    const sourceAnalysis = [
        { source: 'LinkedIn', applications: 145, hires: 23, conversionRate: 15.9 },
        { source: 'Indeed', applications: 98, hires: 12, conversionRate: 12.2 },
        { source: 'Company Website', applications: 76, hires: 18, conversionRate: 23.7 },
        { source: 'Referrals', applications: 54, hires: 15, conversionRate: 27.8 },
        { source: 'Other', applications: 32, hires: 4, conversionRate: 12.5 }
    ];

    // Get time-to-hire analysis (mock data)
    const timeToHireData = [
        { range: '0-7 days', count: 5 },
        { range: '8-14 days', count: 12 },
        { range: '15-21 days', count: 18 },
        { range: '22-30 days', count: 15 },
        { range: '31+ days', count: 8 }
    ];

    // Get diversity metrics (mock data)
    const diversityMetrics = {
        gender: [
            { category: 'Male', count: 145, percentage: 52.3 },
            { category: 'Female', count: 132, percentage: 47.7 }
        ],
        experience: [
            { category: 'Entry Level (0-2 years)', count: 89, percentage: 32.1 },
            { category: 'Mid Level (3-5 years)', count: 112, percentage: 40.4 },
            { category: 'Senior Level (6+ years)', count: 76, percentage: 27.4 }
        ]
    };

    // Get performance metrics
    const performanceMetrics = {
        averageTimeToHire: 18.5,
        applicationToInterviewRate: 24.3,
        interviewToOfferRate: 32.1,
        offerAcceptanceRate: 87.2,
        costPerHire: 3250,
        qualityOfHire: 4.2
    };


    return {
        summary: {
            totalApplications: totalApplications[0]?.count || 0,
            totalCandidates: totalCandidates[0]?.count || 0,
            totalJobs: totalJobs[0]?.count || 0,
            totalInterviews: totalInterviews[0]?.count || 0,
            hiredCandidates: hiredCandidates[0]?.count || 0
        },
        trends: {
            applicationsByDate: applicationsByDate.map(item => ({
                date: item.date,
                count: item.count
            })),
            monthlyTrends
        },
        breakdown: {
            applicationsByJob: applicationsByJob.map(item => ({
                jobTitle: item.jobTitle,
                jobId: item.jobId,
                count: item.count
            })),
            applicationsByStage: applicationsByStage.map(item => ({
                stageName: item.stageName,
                stageOrder: item.stageOrder,
                stageColor: item.stageColor,
                count: item.count
            }))
        },
        analysis: {
            sourceAnalysis,
            timeToHireData,
            diversityMetrics,
            performanceMetrics
        }
    };
};

export async function generateReport(reportType: string, dateRange: { from: Date; to: Date }) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // This would generate specific reports based on type


    return {
        success: true,
        reportId: `report_${Date.now()}`,
        downloadUrl: `/api/reports/download/${reportType}_${Date.now()}.pdf`
    };
};
