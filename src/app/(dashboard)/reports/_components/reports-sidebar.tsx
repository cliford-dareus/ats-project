"use client";

import React, { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    FileText,
    Download,
    Clock,
    Target,
    PieChart,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ReportsSidebar = () => {
    const [selectedReport, setSelectedReport] = useState<string | null>(null);

    const reportCategories = [
        {
            title: "Recruitment Analytics",
            icon: BarChart3,
            reports: [
                { id: "hiring-funnel", name: "Hiring Funnel", description: "Track candidates through stages" },
                { id: "time-to-hire", name: "Time to Hire", description: "Average hiring duration" },
                { id: "source-effectiveness", name: "Source Effectiveness", description: "Best recruitment channels" },
                { id: "conversion-rates", name: "Conversion Rates", description: "Stage-to-stage conversion" }
            ]
        },
        {
            title: "Performance Metrics",
            icon: TrendingUp,
            reports: [
                { id: "recruiter-performance", name: "Recruiter Performance", description: "Individual recruiter stats" },
                { id: "job-performance", name: "Job Performance", description: "Job posting effectiveness" },
                { id: "interview-feedback", name: "Interview Feedback", description: "Interview quality metrics" },
                { id: "offer-acceptance", name: "Offer Acceptance", description: "Offer acceptance rates" }
            ]
        },
        {
            title: "Candidate Insights",
            icon: Users,
            reports: [
                { id: "candidate-demographics", name: "Demographics", description: "Candidate diversity data" },
                { id: "skill-analysis", name: "Skill Analysis", description: "In-demand skills trends" },
                { id: "candidate-experience", name: "Candidate CandidateDetails", description: "Application experience metrics" },
                { id: "rejection-analysis", name: "Rejection Analysis", description: "Common rejection reasons" }
            ]
        },
        {
            title: "Time-based Reports",
            icon: Calendar,
            reports: [
                { id: "monthly-summary", name: "Monthly Summary", description: "Month-over-month trends" },
                { id: "quarterly-review", name: "Quarterly Review", description: "Quarterly performance" },
                { id: "yearly-overview", name: "Yearly Overview", description: "Annual hiring statistics" },
                { id: "seasonal-trends", name: "Seasonal Trends", description: "Hiring pattern analysis" }
            ]
        }
    ];

    const quickActions = [
        { id: "generate-custom", name: "Custom Report", icon: FileText, color: "bg-blue-500" },
        { id: "schedule-report", name: "Schedule Report", icon: Clock, color: "bg-green-500" },
        { id: "export-data", name: "Export Data", icon: Download, color: "bg-purple-500" },
        { id: "dashboard-view", name: "Dashboard View", icon: PieChart, color: "bg-orange-500" }
    ];

    const recentReports = [
        { name: "Weekly Hiring Report", date: "2 hours ago", type: "Automated" },
        { name: "Q4 Performance Review", date: "1 day ago", type: "Custom" },
        { name: "Candidate Source Analysis", date: "3 days ago", type: "Scheduled" },
        { name: "Interview Feedback Summary", date: "1 week ago", type: "Manual" }
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
                            <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                className="flex flex-col items-center gap-1 h-auto py-3"
                            >
                                <div className={`p-2 rounded ${action.color} text-white`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-xs text-center">{action.name}</span>
                            </Button>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Report Categories */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <BarChart3 size={20} />
                    <span className="font-medium text-base">Report Categories</span>
                </div>

                {reportCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                        <div key={category.title} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Icon size={16} />
                                <span>{category.title}</span>
                            </div>
                            <div className="space-y-1 ml-6">
                                {category.reports.map((report) => (
                                    <div
                                        key={report.id}
                                        className={`p-2 rounded cursor-pointer transition-colors ${selectedReport === report.id
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "hover:bg-muted"
                                            }`}
                                        onClick={() => setSelectedReport(report.id)}
                                    >
                                        <div className="text-sm font-medium">{report.name}</div>
                                        <div className="text-xs text-muted-foreground">{report.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Separator />

            {/* Recent Reports */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-medium text-base">Recent Reports</span>
                </div>
                <div className="space-y-2">
                    {recentReports.map((report, index) => (
                        <div
                            key={index}
                            className="p-3 rounded border hover:bg-muted cursor-pointer transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{report.name}</div>
                                    <div className="text-xs text-muted-foreground">{report.date}</div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {report.type}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Report Templates */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Target size={20} />
                    <span className="font-medium text-base">Templates</span>
                </div>
                <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText size={16} className="mr-2" />
                        Executive Summary
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                        <BarChart3 size={16} className="mr-2" />
                        Department Report
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                        <TrendingUp size={16} className="mr-2" />
                        Performance Review
                    </Button>
                </div>
            </div>

            {/* Generate Report Button */}
            <div className="mt-auto">
                <Button className="w-full" disabled={!selectedReport}>
                    <BarChart3 size={16} className="mr-2" />
                    Generate Report
                </Button>
            </div>
        </div>
    );
};

export default ReportsSidebar;
