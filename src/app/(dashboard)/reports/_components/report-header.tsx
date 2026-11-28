"use client";

import { cn, REPORT_RANGES, ReportRange } from "@/lib/utils";
import { Download } from "lucide-react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ExportUtils } from "@/lib/export-utils";
import type { ReportDataset } from "@/server/actions/reports-actions";

interface Props {
    reportData: ReportDataset;
    range: ReportRange;
}

const ReportHeader = ({ reportData, range }: Props) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [exportError, setExportError] = useState<string | null>(null);

    const handleRangeChange = (nextRange: ReportRange) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("range", nextRange);
        router.push(`/reports?${params.toString()}`);
    };

    const handleExportCSV = () => {
        setExportError(null);
        try {
            const { summary, breakdown, analysis, trends } = reportData;
            const headers = ["Section", "Metric", "Value"];
            const data: Record<string, string | number>[] = [
                { Section: "Summary", Metric: "Total Applications", Value: summary.totalApplications },
                { Section: "Summary", Metric: "Total Candidates", Value: summary.totalCandidates },
                { Section: "Summary", Metric: "Total Jobs", Value: summary.totalJobs },
                { Section: "Summary", Metric: "Total Interviews", Value: summary.totalInterviews },
                { Section: "Summary", Metric: "Successful Hires", Value: summary.hiredCandidates },
                {
                    Section: "Summary",
                    Metric: "Average Time to Hire (days)",
                    Value: analysis.performanceMetrics.averageTimeToHire === null
                        ? "No hires yet"
                        : analysis.performanceMetrics.averageTimeToHire,
                },
                {
                    Section: "Summary",
                    Metric: "Application to Interview Rate (%)",
                    Value: analysis.performanceMetrics.applicationToInterviewRate === null
                        ? "—"
                        : analysis.performanceMetrics.applicationToInterviewRate,
                },
                ...breakdown.applicationsByJob.map((job) => ({
                    Section: "Applications by Job",
                    Metric: job.jobTitle,
                    Value: job.count,
                })),
                ...breakdown.applicationsByStage.map((stage) => ({
                    Section: "Applications by Stage",
                    Metric: stage.stageName ?? "Unnamed stage",
                    Value: stage.count,
                })),
                ...trends.monthlyTrends.map((trend) => ({
                    Section: "Monthly Trends",
                    Metric: trend.month,
                    Value: `Applications: ${trend.applications}; Interviews: ${trend.interviews}; Hires: ${trend.hires}`,
                })),
            ];

            ExportUtils.exportToCSV({
                title: "Reports Overview",
                data,
                headers,
                filename: `Reports_${range}_${format(new Date(), "yyyy-MM-dd")}.csv`,
            });
        } catch (error) {
            console.error("Export failed:", error);
            setExportError("Export failed. Please try again.");
        }
    };

    return (
        <div className="flex items-center gap-3 justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground tracking-widder uppercase">Recruitment Analytics & Reports</h1>
                    <span className="px-2.5 py-0.5 bg-brand-50 border border-brand-200/80 text-brand-700 font-bold text-[11px] rounded-full uppercase tracking-wider">
                        Live Intelligence
                    </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                    Track hiring velocity, pipeline conversion rates, and sourcing performance.
                </p>
            </div>

            {/* Global Controls & Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Time Range Filter Buttons */}
                <div className="bg-card border border-border p-1 rounded-2xl flex items-center gap-1 shadow-sm">
                    {REPORT_RANGES.map((rangeOption) => (
                        <button
                            key={rangeOption}
                            onClick={() => handleRangeChange(rangeOption)}
                            className={cn(
                                "px-3 py-1 rounded-xl text-xs font-bold transition-all uppercase",
                                range === rangeOption
                                    ? "bg-foreground text-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {rangeOption}
                        </button>
                    ))}
                </div>

                {/* Export Report Action */}
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-2xl text-xs font-bold transition-all shadow-sm"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV Report
                    </button>
                    {exportError && (
                        <p className="text-xs font-medium text-red-600">{exportError}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportHeader;
