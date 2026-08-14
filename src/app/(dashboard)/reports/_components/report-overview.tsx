"use client";

import React, { useState } from 'react';
import {
    TrendingUp,
    Users,
    Briefcase,
    Target,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    Sparkles,
    Loader2,
    Award,
} from "lucide-react";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { ExportUtils } from "@/lib/export-utils";
import { ReportData } from './reports-component';

interface Props {
    reportData: ReportData;
};

const ReportOverview = ({ reportData }: Props) => {
    const { summary, breakdown, analysis, trends } = reportData;
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    // AI Health Check state
    const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
    const [aiHealthReport, setAiHealthReport] = useState<string | null>(null);

    const handleExportData = (dataType: string) => {
        try {
            const exportData = ExportUtils.exportReportData(dataType, reportData);
            ExportUtils.exportToCSV(exportData);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    // const keyMetrics = [
    //     {
    //         title: 'Average Time to Hire',
    //         value: `${analysis.performanceMetrics.averageTimeToHire} days`,
    //         icon: Clock,
    //         trend: -12,
    //         description: 'Faster than last month'
    //     },
    //     {
    //         title: 'Application to Interview Rate',
    //         value: `${analysis.performanceMetrics.applicationToInterviewRate}%`,
    //         icon: Target,
    //         trend: 8,
    //         description: 'Improvement in screening'
    //     },
    //     {
    //         title: 'Offer Acceptance Rate',
    //         value: `${analysis.performanceMetrics.offerAcceptanceRate}%`,
    //         icon: TrendingUp,
    //         trend: 3,
    //         description: 'Strong candidate interest'
    //     },
    //     {
    //         title: 'Cost Per Hire',
    //         value: `$${analysis.performanceMetrics.costPerHire.toLocaleString()}`,
    //         icon: DollarSign,
    //         trend: -5,
    //         description: 'Cost optimization'
    //     },
    //     {
    //         title: 'Quality of Hire',
    //         value: `${analysis.performanceMetrics.qualityOfHire}/5.0`,
    //         icon: Star,
    //         trend: 15,
    //         description: 'Excellent performance'
    //     }
    // ];

    const getTrendIcon = (trend: number) => {
        return trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
        );
    };

    const getTrendColor = (trend: number) => {
        return trend > 0 ? 'text-green-600' : 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* KPI Headline Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* KPI 1 */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Applications</span>
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{summary.totalApplications}</span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium mt-1">In selected timeframe ({timeRange})</p>
                        </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Avg Time to Hire</span>
                            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analysis.performanceMetrics.averageTimeToHire} <span className="text-lg font-bold text-zinc-500">days</span></span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <ArrowDownRight className="w-3.5 h-3.5" /> -3 days
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium mt-1">Faster than industry benchmark (28d)</p>
                        </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Offer Acceptance Rate</span>
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analysis.performanceMetrics.offerAcceptanceRate}%</span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> +5.8%
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium mt-1">{summary.hiredCandidates} hires from 2 offers</p>
                        </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Avg Cost per Hire</span>
                            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
                                <Target className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">${analysis.performanceMetrics.costPerHire.toLocaleString()}</span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <ArrowDownRight className="w-3.5 h-3.5" /> -12.4%
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium mt-1">Includes job board fees & referrals</p>
                        </div>
                    </div>
                </div>

                {/* AI Intelligence Synthesis Section */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-brand-500/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-black tracking-tight uppercase">AI Executive Recruitment Digest</h2>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Instant AI data synthesis of bottlenecks and channel ROI</p>
                            </div>
                        </div>

                        <button
                            // onClick={handleGenerateAiReport}
                            disabled={isGeneratingAiReport}
                            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGeneratingAiReport ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Synthesizing Data...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {aiHealthReport ? 'Regenerate AI Analysis' : 'Generate Executive Report'}
                                </>
                            )}
                        </button>
                    </div>

                    {aiHealthReport ? (
                        <div className="p-6 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 prose prose-zinc max-w-none text-xs font-medium text-zinc-700 leading-relaxed">
                            {/*<ReactMarkdown>{aiHealthReport}</ReactMarkdown>*/}
                        </div>
                    ) : (
                        <div className="p-8 bg-zinc-50/60 rounded-2xl border border-dashed border-zinc-200 text-center space-y-2">
                            <Sparkles className="w-8 h-8 text-brand-600 mx-auto" />
                            <h3 className="text-sm font-bold text-zinc-800">Generate AI Automated Recruitment Diagnostics</h3>
                            <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                                Click the button above to analyze hiring velocities, detect stage bottlenecks, and receive AI-backed recommendations tailored to your active open roles.
                            </p>
                        </div>
                    )}
                </div>

                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart 1: Application Volume & Pipeline Velocity (Area Chart) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black tracking-tight uppercase">Application Velocity & Pipeline Trend</h3>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Monthly applicant influx vs interviews conducted and hires made</p>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-brand-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600" /> Applicants
                                </span>
                                <span className="flex items-center gap-1.5 text-purple-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Interviews
                                </span>
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Hires
                                </span>
                            </div>
                        </div>

                        <div className="h-72 w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="applications" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
                                    <Area type="monotone" dataKey="interviews" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorInterviews)" />
                                    <Area type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={2} fill="transparent" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Stage Distribution Breakdown (Pie Chart) */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6 flex flex-col justify-between">
                        <div>
                            <h3 className="font-black tracking-tight uppercase">Active Candidate Distribution</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Breakdown of candidates across pipeline stages</p>
                        </div>

                        <div className="h-56 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={reportData.breakdown.applicationsByStage}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="count"
                                    >
                                        {reportData.breakdown.applicationsByStage.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.stageColor} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
                            {reportData.breakdown.applicationsByStage.map((item) => (
                                <div
                                    key={item.stageName as string}
                                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100"
                                >
                                    <span className="flex items-center gap-1.5 text-zinc-600">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.stageColor }} />
                                        {item.stageName}
                                    </span>
                                    <span className="text-zinc-900 font-extrabold">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sourcing Channels & Department Requisition Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sourcing Channels Bar Chart */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Sourcing Channel Performance</h3>
                                <p className="text-xs text-zinc-400 font-medium">Total volume vs candidate conversion rate (%)</p>
                            </div>
                            <Award className="w-5 h-5 text-brand-600" />
                        </div>

                        {/*<div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sourcingChannelData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                    <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                    <YAxis dataKey="channel" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} width={110} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="applicants" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>*/}
                    </div>

                    {/* Department Open Requisitions List */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Job Requisition Health</h3>
                                <p className="text-xs text-zinc-400 font-medium">Status and applicant numbers for open positions</p>
                            </div>
                            <Briefcase className="w-5 h-5 text-brand-600" />
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {breakdown.applicationsByJob.map((job, index) => (
                                <div key={index} className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/60 flex items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-zinc-900">{job.jobTitle}</h4>
                                        <p className="text-[11px] text-zinc-500 font-medium">{job.department} • {job.location}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs font-extrabold text-brand-700">{job.count} Applicants</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Posted {job.postedDate}</p>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                            job.status === 'Open' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-600"
                                        )}>
                                            {job.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Department Open Requisitions List */}
                    <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Job Requisition Health</h3>
                                <p className="text-xs text-zinc-400 font-medium">Status and applicant numbers for open positions</p>
                            </div>
                            <Briefcase className="w-5 h-5 text-brand-600" />
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">

                            {/*{breakdown.applicationsByJob.slice(0, 5).map((job, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm truncate">{job.jobTitle}</p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <Progress
                                                            value={(job.count / breakdown.applicationsByJob[0].count) * 100}
                                                            className="flex-1 h-2"
                                                        />
                                                        <span className="text-xs text-gray-500 min-w-[3rem]">
                                                            {job.count} apps
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}*/}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportOverview;
