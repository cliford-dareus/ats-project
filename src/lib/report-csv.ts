import { format } from "date-fns";
import type { ReportDataset } from "@/server/actions/reports-actions";

/**
 * Server-side CSV rendering for generated reports.
 *
 * A generated report is never stored as a file: the history row keeps only
 * the type + date range + selected metrics, and the download route
 * recomputes the dataset and renders it through here. Every number comes
 * from the org-scoped dataset — nothing in a CSV is invented.
 */

export type ReportTypeId =
    | "executive-summary"
    | "detailed-analytics"
    | "pipeline-report"
    | "source-analysis";

export const REPORT_TYPES: { id: ReportTypeId; name: string; description: string }[] = [
    {
        id: "executive-summary",
        name: "Executive Summary",
        description: "High-level overview of recruitment performance",
    },
    {
        id: "detailed-analytics",
        name: "Detailed Analytics",
        description: "Comprehensive analysis with charts and insights",
    },
    {
        id: "pipeline-report",
        name: "Pipeline Report",
        description: "Current status of all candidates in the pipeline",
    },
    {
        id: "source-analysis",
        name: "Source Analysis",
        description: "Performance analysis of recruitment sources",
    },
];

export function isReportType(value: unknown): value is ReportTypeId {
    return (
        typeof value === "string" &&
        (REPORT_TYPES as { id: string }[]).some((t) => t.id === value)
    );
}

export function reportTypeName(type: ReportTypeId): string {
    return REPORT_TYPES.find((t) => t.id === type)?.name ?? type;
}

/**
 * Metric ids the generator offers. Only metrics that exist in stored data
 * are here — cost per hire, offer acceptance rate, quality of hire and
 * diversity metrics are deliberately absent: the app collects none of that
 * data, so no report may claim to include them.
 */
export const REPORT_METRIC_IDS = [
    "applications",
    "candidates",
    "hires",
    "time-to-hire",
    "conversion-rates",
    "source-effectiveness",
] as const;

export type ReportMetricId = (typeof REPORT_METRIC_IDS)[number];

export function isReportMetricId(value: unknown): value is ReportMetricId {
    return (
        typeof value === "string" &&
        (REPORT_METRIC_IDS as readonly string[]).includes(value)
    );
}

function escapeCell(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function section(title: string, headers: string[], rows: (string | number | null)[][]): string {
    const lines = [
        title,
        headers.map(escapeCell).join(","),
        ...rows.map((row) => row.map(escapeCell).join(",")),
    ];
    return lines.join("\n");
}

type CsvSection = {
    /** Metric ids this section answers to; included when no metrics were selected or any tag was. */
    metricTags: ReportMetricId[];
    render: (data: ReportDataset) => string;
};

const SECTIONS: Record<string, CsvSection> = {
    summary: {
        metricTags: ["applications", "candidates", "hires"],
        render: (data) =>
            section(
                "Summary",
                ["Metric", "Value"],
                [
                    ["Total Applications", data.summary.totalApplications],
                    ["Total Candidates", data.summary.totalCandidates],
                    ["Total Jobs", data.summary.totalJobs],
                    ["Total Interviews", data.summary.totalInterviews],
                    ["Successful Hires", data.summary.hiredCandidates],
                ]
            ),
    },
    performance: {
        metricTags: ["conversion-rates", "time-to-hire"],
        render: (data) =>
            section(
                "Performance",
                ["Metric", "Value"],
                [
                    [
                        "Average Time to Hire (days)",
                        data.analysis.performanceMetrics.averageTimeToHire ?? "No hires yet",
                    ],
                    [
                        "Application to Interview Rate (%)",
                        data.analysis.performanceMetrics.applicationToInterviewRate ??
                            "No applications yet",
                    ],
                ]
            ),
    },
    daily: {
        metricTags: ["applications"],
        render: (data) =>
            section(
                "Applications by Day",
                ["Date", "Applications"],
                data.trends.applicationsByDate.map((row) => [row.date, row.count])
            ),
    },
    monthly: {
        metricTags: ["applications", "hires"],
        render: (data) =>
            section(
                "Monthly Trends (last 12 months)",
                ["Month", "Applications", "Interviews", "Hires"],
                data.trends.monthlyTrends.map((row) => [
                    row.month,
                    row.applications,
                    row.interviews,
                    row.hires,
                ])
            ),
    },
    byJob: {
        metricTags: ["applications"],
        render: (data) =>
            section(
                "Applications by Job",
                ["Job", "Status", "Location", "Applications"],
                data.breakdown.applicationsByJob.map((row) => [
                    row.jobTitle,
                    row.job_status ?? "",
                    row.job_location,
                    row.count,
                ])
            ),
    },
    byStage: {
        metricTags: ["conversion-rates"],
        render: (data) =>
            section(
                "Applications by Stage",
                ["Stage", "Applications"],
                data.breakdown.applicationsByStage.map((row) => [
                    row.stageName ?? "Unknown",
                    row.count,
                ])
            ),
    },
    source: {
        metricTags: ["source-effectiveness"],
        render: (data) =>
            section(
                "Source Analysis",
                ["Source", "Applications", "Hires", "Conversion Rate (%)"],
                data.analysis.sourceAnalysis.map((row) => [
                    row.source,
                    row.applications,
                    row.hires,
                    row.conversionRate,
                ])
            ),
    },
    timeToHire: {
        metricTags: ["time-to-hire"],
        render: (data) =>
            section(
                "Time to Hire Distribution",
                ["Range", "Hires"],
                data.analysis.timeToHireData.map((row) => [row.range, row.count])
            ),
    },
};

/** Which sections each report type contains, in order. */
const TYPE_SECTIONS: Record<ReportTypeId, (keyof typeof SECTIONS)[]> = {
    "executive-summary": ["summary", "performance", "monthly"],
    "detailed-analytics": [
        "summary",
        "performance",
        "daily",
        "monthly",
        "byJob",
        "byStage",
        "source",
        "timeToHire",
    ],
    "pipeline-report": ["summary", "byStage", "byJob"],
    "source-analysis": ["summary", "source", "byJob"],
};

export function buildReportCsv(
    type: ReportTypeId,
    data: ReportDataset,
    meta: { from: Date; to: Date; generatedAt: Date; metrics?: ReportMetricId[] | null }
): string {
    const selected = meta.metrics ?? null;
    const include = (tags: ReportMetricId[]) =>
        !selected || selected.length === 0 || tags.some((tag) => selected.includes(tag));

    const header = [
        `${reportTypeName(type)}`,
        `Date range: ${format(meta.from, "yyyy-MM-dd")} to ${format(meta.to, "yyyy-MM-dd")}`,
        `Generated: ${format(meta.generatedAt, "yyyy-MM-dd HH:mm")}`,
        "",
    ].join("\n");

    const body = TYPE_SECTIONS[type]
        .filter((key) => include(SECTIONS[key].metricTags))
        .map((key) => SECTIONS[key].render(data))
        .join("\n\n");

    return `${header}\n${body}\n`;
}
