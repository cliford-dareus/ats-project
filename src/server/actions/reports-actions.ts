"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import {
    applications,
    candidates,
    job_listings,
    stages,
    interviews,
    report_history,
    usersTable,
} from "@/drizzle/schema";
import {
    count,
    eq,
    gte,
    lte,
    desc,
    sql,
    and,
    isNull,
} from "drizzle-orm";
import { subDays, subMonths, eachDayOfInterval, eachMonthOfInterval, format, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { requirePermission } from "@/server/permissions";
import {
    buildReportCsv,
    isReportMetricId,
    isReportType,
    reportTypeName,
    type ReportMetricId,
    type ReportTypeId,
} from "@/lib/report-csv";

/**
 * Reports are computed from real org-scoped data only. Anything the app
 * does not store is not in a report: offer acceptance rate, cost per hire,
 * quality of hire and diversity metrics were hardcoded mocks and are gone —
 * no offer, cost, quality or demographic data is collected anywhere.
 *
 * Date semantics: every count is bounded by [from, to] on the row's
 * created_at, except hires, which are bounded on candidates.updated_at
 * (the flip to HIRED updates it — the same proxy the dashboard's
 * time-to-hire uses, since there is no dedicated hired_at column).
 * Monthly trends always cover the last 12 months ending at `to`.
 */

export type ReportRange = "7d" | "30d" | "90d" | "1y";

export const REPORT_RANGES: ReportRange[] = ["7d", "30d", "90d", "1y"];

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "Last 12 months",
};

export function isReportRange(value: unknown): value is ReportRange {
    return typeof value === "string" && (REPORT_RANGES as string[]).includes(value);
}

function rangeStart(range: ReportRange, now: Date): Date {
    switch (range) {
        case "7d":
            return subDays(now, 7);
        case "90d":
            return subDays(now, 90);
        case "1y":
            return subMonths(now, 12);
        default:
            return subDays(now, 30);
    }
}

const TIME_TO_HIRE_BUCKETS = ["0-7 days", "8-14 days", "15-21 days", "22-30 days", "31+ days"] as const;

function bucketTimeToHire(durations: number[]): { range: string; count: number }[] {
    const buckets = TIME_TO_HIRE_BUCKETS.map((range) => ({ range, count: 0 }));
    for (const days of durations) {
        if (days <= 7) buckets[0].count++;
        else if (days <= 14) buckets[1].count++;
        else if (days <= 21) buckets[2].count++;
        else if (days <= 30) buckets[3].count++;
        else buckets[4].count++;
    }
    return buckets;
}

async function buildReportDataset(orgId: string, from: Date, to: Date) {
    const last12Months = subMonths(to, 12);

    // ── Summary counts (all bounded by [from, to]) ─────────────────────────
    const [
        totalApplications,
        totalCandidates,
        totalJobs,
        totalInterviews,
        hiredCandidates,
    ] = await Promise.all([
        db.select({ count: count() })
            .from(applications)
            .where(and(eq(applications.organization, orgId), isNull(applications.deleted_at), gte(applications.created_at, from), lte(applications.created_at, to))),
        db.select({ count: count() })
            .from(candidates)
            .where(and(eq(candidates.organization, orgId), isNull(candidates.deleted_at), gte(candidates.created_at, from), lte(candidates.created_at, to))),
        db.select({ count: count() })
            .from(job_listings)
            .where(and(eq(job_listings.organization, orgId), isNull(job_listings.deleted_at), gte(job_listings.created_at, from), lte(job_listings.created_at, to))),
        db.select({ count: count() })
            .from(interviews)
            .leftJoin(applications, eq(applications.id, interviews.applications_id))
            .where(and(eq(interviews.organization, orgId), isNull(applications.deleted_at), gte(interviews.created_at, from), lte(interviews.created_at, to))),
        db.select({ count: count() })
            .from(candidates)
            .where(and(eq(candidates.organization, orgId), eq(candidates.status, 'HIRED'), isNull(candidates.deleted_at), gte(candidates.updated_at, from), lte(candidates.updated_at, to))),
    ]);

    // ── Applications by day (zero-filled buckets) ──────────────────────────
    const daily = differenceInDays(to, from) <= 366;
    const dateExpr = daily
        ? sql<string>`DATE(${applications.created_at})`
        : sql<string>`DATE_FORMAT(${applications.created_at}, '%Y-%m')`;
    const applicationsByDateRows = await db
        .select({ date: dateExpr, count: count() })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to)
        ))
        .groupBy(dateExpr)
        .orderBy(dateExpr);
    const byDateMap = new Map(applicationsByDateRows.map((row) => [row.date, row.count]));
    const bucketDates = daily
        ? eachDayOfInterval({ start: from, end: to }).map((d) => format(d, "yyyy-MM-dd"))
        : eachMonthOfInterval({ start: from, end: to }).map((d) => format(d, "yyyy-MM"));
    const applicationsByDate = bucketDates.map((date) => ({ date, count: byDateMap.get(date) ?? 0 }));

    // ── Applications by job (top 10, created in range) ─────────────────────
    const applicationsByJob = await db
        .select({
            jobTitle: job_listings.name,
            jobId: job_listings.id,
            job_created_at: job_listings.created_at,
            job_location: job_listings.location,
            job_status: job_listings.status,
            job_department: job_listings.department,
            count: count(applications.id),
        })
        .from(applications)
        .innerJoin(job_listings, eq(applications.job_id, job_listings.id))
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            isNull(job_listings.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to)
        ))
        .groupBy(job_listings.id, job_listings.name)
        .orderBy(desc(count(applications.id)))
        .limit(10);

    // ── Applications by stage (current stage, created in range) ────────────
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
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to)
        ))
        .where(and(eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .groupBy(stages.id, stages.stage_name, stages.stage_order_id, stages.color)
        .orderBy(stages.stage_order_id, stages.id);

    // ── Monthly trends (last 12 months ending at `to`) ─────────────────────
    const monthlyApplications = await db
        .select({
            month: sql<string>`DATE_FORMAT(${applications.created_at}, '%Y-%m')`,
            count: count(applications.id),
        })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, last12Months)
        ))
        .groupBy(sql`DATE_FORMAT(${applications.created_at}, '%Y-%m')`);

    const monthlyInterviews = await db
        .select({
            month: sql<string>`DATE_FORMAT(${interviews.created_at}, '%Y-%m')`,
            count: count(interviews.id),
        })
        .from(interviews)
        .leftJoin(applications, eq(applications.id, interviews.applications_id))
        .where(and(
            eq(interviews.organization, orgId),
            isNull(applications.deleted_at),
            gte(interviews.created_at, last12Months)
        ))
        .groupBy(sql`DATE_FORMAT(${interviews.created_at}, '%Y-%m')`);

    // Uses candidates.updated_at as the "hired" timestamp, since that's the
    // last time the status field (including a flip to HIRED) changed. If a
    // hired candidate is later edited for an unrelated reason this would
    // drift, but there's no dedicated hired_at column in the schema.
    const monthlyHires = await db
        .select({
            month: sql<string>`DATE_FORMAT(${candidates.updated_at}, '%Y-%m')`,
            count: count(candidates.id),
        })
        .from(candidates)
        .where(and(
            eq(candidates.organization, orgId),
            eq(candidates.status, 'HIRED'),
            isNull(candidates.deleted_at),
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

    // ── Source analysis (real: applications.referral_source, collected on
    // the public apply form). NULL/blank means the applicant gave none. ────
    const sourceRows = await db
        .select({ source: applications.referral_source, count: count(applications.id) })
        .from(applications)
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to)
        ))
        .groupBy(applications.referral_source)
        .orderBy(desc(count(applications.id)));
    const sourceHireRows = await db
        .select({ source: applications.referral_source, count: count(applications.id) })
        .from(applications)
        .innerJoin(candidates, eq(candidates.id, applications.candidate))
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to),
            eq(candidates.status, 'HIRED'),
            isNull(candidates.deleted_at)
        ))
        .groupBy(applications.referral_source);
    const hiresBySource = new Map(
        sourceHireRows.map((row) => [(row.source?.trim() || "Not specified"), row.count])
    );
    const sourceAnalysis = sourceRows.map((row) => {
        const source = row.source?.trim() || "Not specified";
        const hires = hiresBySource.get(source) ?? 0;
        return {
            source,
            applications: row.count,
            hires,
            conversionRate: row.count > 0 ? Math.round((hires / row.count) * 1000) / 10 : 0,
        };
    });

    // ── Time to hire (real: first application → HIRED flip, same proxy as
    // the dashboard). Hires counted are those hired inside [from, to]. ─────
    const hireRows = await db
        .select({
            applied_at: sql<Date>`MIN(${applications.created_at})`,
            hired_at: candidates.updated_at,
        })
        .from(candidates)
        .innerJoin(applications, eq(applications.candidate, candidates.id))
        .where(and(
            eq(candidates.status, "HIRED"),
            eq(candidates.organization, orgId),
            isNull(candidates.deleted_at),
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(candidates.updated_at, from),
            lte(candidates.updated_at, to)
        ))
        .groupBy(candidates.id, candidates.updated_at);
    const durations = hireRows
        .map((hire) => {
            if (!hire.applied_at || !hire.hired_at) return null;
            const days = (new Date(hire.hired_at).getTime() - new Date(hire.applied_at).getTime()) / (1000 * 60 * 60 * 24);
            return days >= 0 ? days : null;
        })
        .filter((days): days is number => days !== null);
    const averageTimeToHire = durations.length > 0
        ? Math.round((durations.reduce((sum, days) => sum + days, 0) / durations.length) * 10) / 10
        : null;

    // ── Application → interview rate (real). An application counts as
    // interviewed when it has at least one interview created in [from, to]. ─
    const totalApps = totalApplications[0]?.count || 0;
    const [interviewed] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${applications.id})` })
        .from(applications)
        .innerJoin(interviews, eq(interviews.applications_id, applications.id))
        .where(and(
            eq(applications.organization, orgId),
            isNull(applications.deleted_at),
            gte(applications.created_at, from),
            lte(applications.created_at, to),
            gte(interviews.created_at, from),
            lte(interviews.created_at, to)
        ));
    const applicationToInterviewRate = totalApps > 0
        ? Math.round(((interviewed?.count ?? 0) / totalApps) * 1000) / 10
        : null;

    return {
        summary: {
            totalApplications: totalApps,
            totalCandidates: totalCandidates[0]?.count || 0,
            totalJobs: totalJobs[0]?.count || 0,
            totalInterviews: totalInterviews[0]?.count || 0,
            hiredCandidates: hiredCandidates[0]?.count || 0,
        },
        trends: {
            applicationsByDate,
            monthlyTrends,
        },
        breakdown: {
            applicationsByJob: applicationsByJob.map((item) => ({
                jobTitle: item.jobTitle,
                jobId: item.jobId,
                job_created_at: item.job_created_at,
                job_location: item.job_location,
                job_department: item.job_department,
                job_status: item.job_status,
                count: item.count,
            })),
            applicationsByStage: applicationsByStage.map((item) => ({
                stageName: item.stageName,
                stageOrder: item.stageOrder,
                stageColor: item.stageColor,
                count: item.count,
            })),
        },
        analysis: {
            sourceAnalysis,
            timeToHireData: bucketTimeToHire(durations),
            performanceMetrics: {
                averageTimeToHire,
                applicationToInterviewRate,
            },
        },
    };
}

export type ReportDataset = Awaited<ReturnType<typeof buildReportDataset>>;

export async function getReportData(range: ReportRange = "30d") {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    await requirePermission("report:view");

    const now = new Date();
    return buildReportDataset(orgId, rangeStart(range, now), now);
}

export type ReportHistoryEntry = {
    id: number;
    type: ReportTypeId;
    typeName: string;
    dateFrom: string;
    dateTo: string;
    metrics: ReportMetricId[] | null;
    generatedByName: string | null;
    generatedAt: string;
};

function parseStoredMetrics(raw: string | null): ReportMetricId[] | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        const valid = parsed.filter(isReportMetricId);
        return valid.length > 0 ? valid : null;
    } catch {
        return null;
    }
}

function toHistoryEntry(row: typeof report_history.$inferSelect): ReportHistoryEntry {
    return {
        id: row.id,
        type: row.report_type as ReportTypeId,
        typeName: reportTypeName(row.report_type as ReportTypeId),
        dateFrom: row.date_from.toISOString(),
        dateTo: row.date_to.toISOString(),
        metrics: parseStoredMetrics(row.metrics),
        generatedByName: row.generated_by_name,
        generatedAt: row.created_at.toISOString(),
    };
}

export async function getReportHistory(): Promise<ReportHistoryEntry[]> {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    await requirePermission("report:view");

    const rows = await db
        .select()
        .from(report_history)
        .where(eq(report_history.organization, orgId))
        .orderBy(desc(report_history.created_at))
        .limit(50);
    return rows.map(toHistoryEntry);
}

export async function generateReport(
    reportType: string,
    dateRange: { from: Date; to: Date },
    metrics?: string[]
) {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");
    await requirePermission("report:generate");

    if (!isReportType(reportType)) throw new Error("Invalid report type");
    if (!(dateRange.from instanceof Date) || !(dateRange.to instanceof Date)) {
        throw new Error("Invalid date range");
    }
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to);
    if (from >= to) throw new Error("From date must be before to date");

    const selectedMetrics = (metrics ?? []).filter(isReportMetricId);

    // Display name from users_table; fall back to the Clerk id when the
    // user has no local row (same pattern as record_activity).
    const [user] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

    const inserted = await db.insert(report_history).values({
        organization: orgId,
        report_type: reportType,
        date_from: from,
        date_to: to,
        metrics: selectedMetrics.length > 0 ? JSON.stringify(selectedMetrics) : null,
        generated_by: userId,
        generated_by_name: user?.name ?? userId,
    });
    const reportId = (inserted as unknown as { insertId: number }).insertId;
    if (!reportId) throw new Error("Failed to record report");

    return {
        success: true,
        reportId,
        downloadUrl: `/api/reports/download/${reportId}`,
    };
}

export async function deleteReportHistory(reportId: number) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    await requirePermission("report:generate");

    await db
        .delete(report_history)
        .where(and(eq(report_history.id, reportId), eq(report_history.organization, orgId)));
    return { success: true };
}

/** Recompute a stored report and render it as CSV. Null when the row is missing or belongs to another org. */
export async function getGeneratedReportCsv(reportId: number): Promise<{ filename: string; csv: string } | null> {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    await requirePermission("report:view");

    const [row] = await db
        .select()
        .from(report_history)
        .where(and(eq(report_history.id, reportId), eq(report_history.organization, orgId)))
        .limit(1);
    if (!row) return null;
    if (!isReportType(row.report_type)) return null;

    const dataset = await buildReportDataset(orgId, row.date_from, row.date_to);
    const csv = buildReportCsv(row.report_type, dataset, {
        from: row.date_from,
        to: row.date_to,
        generatedAt: row.created_at,
        metrics: parseStoredMetrics(row.metrics),
    });
    const filename = `${row.report_type}_${format(row.date_from, "yyyy-MM-dd")}_to_${format(row.date_to, "yyyy-MM-dd")}.csv`;
    return { filename, csv };
}
