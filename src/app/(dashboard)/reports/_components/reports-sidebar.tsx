"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    BarChart3,
    FileText,
    Clock,
    PieChart,
    Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { REPORT_TYPES } from "@/lib/report-csv";
import { format } from "date-fns";

interface RecentReport {
    id: number;
    typeName: string;
    dateFrom: string;
    dateTo: string;
    generatedByName: string | null;
    generatedAt: string;
}

const ReportsSidebar = () => {
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [recentError, setRecentError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/reports/generate");
                if (!res.ok) throw new Error("Failed to load recent reports");
                const json = (await res.json()) as { reports?: RecentReport[] };
                if (!cancelled) setRecentReports((json.reports ?? []).slice(0, 5));
            } catch (error) {
                console.error("Failed to load recent reports:", error);
                if (!cancelled) setRecentError("Could not load recent reports.");
            } finally {
                if (!cancelled) setLoadingRecent(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const quickActions = [
        { id: "generate-custom", name: "Custom Report", icon: FileText, color: "bg-blue-500", href: "/reports?tab=generate" },
        { id: "dashboard-view", name: "Dashboard View", icon: PieChart, color: "bg-orange-500", href: "/dashboard" },
    ];

    return (
        <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto">
            {/* Quick Actions */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Activity size={20} />
                    <span className="font-medium text-base">Quick Actions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.id}
                                href={action.href}
                                className="flex flex-col items-center gap-1 h-auto py-3 px-2 rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                            >
                                <div className={`p-2 rounded ${action.color} text-white`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-xs text-center">{action.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Report Types */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <BarChart3 size={20} />
                    <span className="font-medium text-base">Report Types</span>
                </div>

                <div className="space-y-1">
                    {REPORT_TYPES.map((report) => (
                        <Link
                            key={report.id}
                            href={`/reports?tab=generate&type=${report.id}`}
                            onClick={() => setSelectedReport(report.id)}
                            className={`block p-2 rounded cursor-pointer transition-colors ${selectedReport === report.id
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "hover:bg-muted"
                                }`}
                        >
                            <div className="text-sm font-medium">{report.name}</div>
                            <div className="text-xs text-muted-foreground">{report.description}</div>
                        </Link>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Recent Reports */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-medium text-base">Recent Reports</span>
                </div>
                <div className="space-y-2">
                    {loadingRecent ? (
                        <p className="text-xs text-muted-foreground">Loading recent reports…</p>
                    ) : recentError ? (
                        <p className="text-xs text-red-600">{recentError}</p>
                    ) : recentReports.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No reports generated yet.</p>
                    ) : (
                        recentReports.map((report) => (
                            <Link
                                key={report.id}
                                href="/reports?tab=history"
                                className="block p-3 rounded border hover:bg-muted cursor-pointer transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{report.typeName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(report.generatedAt), "MMM d, yyyy")}
                                            {report.generatedByName ? ` • ${report.generatedByName}` : ""}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(report.dateFrom), "MMM d, yyyy")} – {format(new Date(report.dateTo), "MMM d, yyyy")}
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        Report
                                    </Badge>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsSidebar;
