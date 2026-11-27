"use client";

import React from 'react';
import {
    Users,
    Briefcase,
    Target,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ReportDataset, ReportRange } from '@/server/actions/reports-actions';
import { REPORT_RANGE_LABELS } from '@/server/actions/reports-actions';

interface Props {
    reportData: ReportDataset;
    range: ReportRange;
};

const FALLBACK_STAGE_COLOR = '#a1a1aa';

const ReportOverview = ({ reportData, range }: Props) => {
    const { summary, breakdown, analysis, trends } = reportData;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* KPI Headline Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* KPI 1 */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Applications</span>
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-foreground tracking-tight">{summary.totalApplications}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">{REPORT_RANGE_LABELS[range]}</p>
                        </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Time to Hire</span>
                            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                {analysis.performanceMetrics.averageTimeToHire === null ? (
                                    <span className="text-3xl font-extrabold text-foreground tracking-tight">No hires yet</span>
                                ) : (
                                    <span className="text-3xl font-extrabold text-foreground tracking-tight">{analysis.performanceMetrics.averageTimeToHire} <span className="text-lg font-bold text-muted-foreground">days</span></span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Average days from application to hire</p>
                        </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Application to Interview Rate</span>
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                {analysis.performanceMetrics.applicationToInterviewRate === null ? (
                                    <span className="text-3xl font-extrabold text-foreground tracking-tight">—</span>
                                ) : (
                                    <span className="text-3xl font-extrabold text-foreground tracking-tight">{analysis.performanceMetrics.applicationToInterviewRate}%</span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Share of applications reaching interview</p>
                        </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Successful Hires</span>
                            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
                                <Target className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-foreground tracking-tight">{summary.hiredCandidates}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">{REPORT_RANGE_LABELS[range]}</p>
                        </div>
                    </div>
                </div>

                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart 1: Application Volume & Pipeline Velocity (Area Chart) */}
                    <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black tracking-tight uppercase">Application Velocity & Pipeline Trend</h3>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Monthly applicant influx vs interviews conducted and hires made</p>
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
                    <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6 flex flex-col justify-between">
                        <div>
                            <h3 className="font-black tracking-tight uppercase">Active Candidate Distribution</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Breakdown of candidates across pipeline stages</p>
                        </div>

                        {reportData.breakdown.applicationsByStage.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-medium text-center py-8">No pipeline data in this range.</p>
                        ) : (
                            <>
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
                                                    <Cell key={`cell-${index}`} fill={entry.stageColor ?? FALLBACK_STAGE_COLOR} />
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
                                            className="flex items-center justify-between p-2 rounded-xl bg-muted border border-border"
                                        >
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.stageColor ?? FALLBACK_STAGE_COLOR }} />
                                                {item.stageName}
                                            </span>
                                            <span className="text-foreground font-extrabold">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sourcing Channels & Department Requisition Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sourcing Channels Bar Chart */}
                    <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-foreground tracking-tight">Sourcing Channel Performance</h3>
                                <p className="text-xs text-muted-foreground font-medium">Total volume vs candidate conversion rate (%)</p>
                            </div>
                        </div>

                        {analysis.sourceAnalysis.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-medium text-center py-8">No applications in this range yet.</p>
                        ) : (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.sourceAnalysis} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                        <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                        <YAxis dataKey="source" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} width={110} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                                            formatter={(value, name, props) => {
                                                if (name === 'applications') {
                                                    const datum = props.payload as { hires: number; conversionRate: number };
                                                    return [`${value} applications, ${datum.hires} hires (${datum.conversionRate}% converted)`, 'Applications'];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                        <Bar dataKey="applications" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Department Open Requisitions List */}
                    <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-foreground tracking-tight">Job Requisition Health</h3>
                                <p className="text-xs text-muted-foreground font-medium">Status and applicant numbers for open positions</p>
                            </div>
                            <Briefcase className="w-5 h-5 text-brand-600" />
                        </div>

                        {breakdown.applicationsByJob.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-medium text-center py-8">No applications in this range yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {breakdown.applicationsByJob.map((job, index) => (
                                    <div key={index} className="p-4 bg-muted/80 rounded-2xl border border-border/60 flex items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground">{job.jobTitle}</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium">{job.job_department} • {job.job_location}</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-xs font-extrabold text-brand-700">{job.count} Applicants</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">Posted {format(job.job_created_at, 'MMM d, yyyy')}</p>
                                            </div>
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                                job.job_status === 'OPEN' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-muted text-muted-foreground"
                                            )}>
                                                {job.job_status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportOverview;
