"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Briefcase,
    TrendingUp,
    Target,
    Activity,
    Calendar,
    CalendarClock,
    Clock,
    Hourglass,
    FileText,
    FileUser,
    BriefcaseBusiness,
    LayoutGrid,
    List
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnalyticsOverview from "./analytics-overview";
import StripCalendar from "@/components/strip-calenda";
import MetricCard from "@/components/metric-card";
import ApplicationBreakdown from './application-breakdown';
import QuickActions from './quick-actions';
import { ACTION_LABELS, time_ago } from "@/lib/activity-labels";
import type { ActivityLogEntry } from "@/server/queries/drizzle/activity";
import type { AttentionStats, TrendRange } from "@/server/actions/dashboard-actions";

interface DashboardMetrics {
    totalApplications: number;
    totalCandidates: number;
    activeJobs: number;
    hiredThisMonth: number;
    applicationsTrend: number;
    candidatesTrend: number;
    jobsTrend: number | null;
    hiresTrend: number;
};

export interface UpcomingInterview {
    id: string;
    applicationId: number;
    candidateName: string;
    candidateAvatar?: string;
    jobTitle: string;
    time: Date;
    type: 'phone' | 'video' | 'in-person';
};

interface JobPipelineData {
    jobId: number;
    jobTitle: string;
    totalApplications: number;
    stages: {
        name: string;
        count: number;
        color: string;
    }[];
};

export interface RecruitmentFunnel {
    stage: "Applied" | "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | "Drafted";
    count: number;
    stageColor: string;
    conversion: number;
};

type Props = {
    metrics: DashboardMetrics;
    recentActivity: ActivityLogEntry[];
    upcomingInterviews: UpcomingInterview[];
    jobPipeline: JobPipelineData[];
    recruitmentFunnel: RecruitmentFunnel[];
    applicationTrend: { date: string, count: number }[]
    trendRange: TrendRange;
    attention: AttentionStats;
    userName: string;
};

const Dashboard = ({
    metrics,
    recentActivity,
    upcomingInterviews,
    jobPipeline,
    recruitmentFunnel,
    applicationTrend,
    trendRange,
    attention,
    userName
}: Props) => {
    const [timeOfDay, setTimeOfDay] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const router = useRouter();

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay('morning');
        else if (hour < 17) setTimeOfDay('afternoon');
        else setTimeOfDay('evening');
    }, []);

    const handleRangeChange = (value: string) => {
        router.push(`/dashboard?range=${value}`);
    };

    const getActivityIcon = (entityType: ActivityLogEntry["entity_type"]) => {
        switch (entityType) {
            case 'job':
                return <BriefcaseBusiness className="h-4 w-4" />;
            case 'candidate':
                return <Users className="h-4 w-4" />;
            case 'application':
                return <FileUser className="h-4 w-4" />;
            case 'interview':
                return <Calendar className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityColor = (entityType: ActivityLogEntry["entity_type"]) => {
        switch (entityType) {
            case 'job':
                return 'bg-purple-100 text-purple-600';
            case 'candidate':
                return 'bg-blue-100 text-blue-600';
            case 'application':
                return 'bg-green-100 text-green-600';
            case 'interview':
                return 'bg-yellow-100 text-yellow-600';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const statusCounts = Object.entries(attention.jobsByStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => `${count} ${status.toLowerCase()}`);

    return (
        <div className="flex-1 w-full grid grid-cols-1 xl:grid-cols-12 gap-4 min-w-0">
            <div className=" space-y-4 w-full xl:col-span-8 ">
                {/* Header */}
                <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-4">
                    <div className="space-y-3">
                        <div
                            className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                            <LayoutGrid size={12} />
                            Main Dashboard
                        </div>
                        <h2 className="text-4xl uppercase font-bold tracking-tight">Good {timeOfDay}, {userName}.</h2>
                        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your recruitment
                            today.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-card border border-border p-1.5 rounded-md shadow-sm" role="group" aria-label="Pipeline view">
                            <button
                                onClick={() => setViewMode('grid')}
                                aria-pressed={viewMode === 'grid'}
                                title="Grid view"
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-lg ' : 'text-muted-foreground hover:text-muted-foreground'}`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                aria-pressed={viewMode === 'list'}
                                title="List view"
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-lg ' : 'text-muted-foreground hover:text-muted-foreground'}`}
                            >
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Metrics Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Applications"
                        value={metrics.totalApplications}
                        trend={metrics.applicationsTrend}
                        icon={Users}
                        color="blue"
                    />
                    <MetricCard
                        title="Active Candidates"
                        value={metrics.totalCandidates}
                        trend={metrics.candidatesTrend}
                        icon={Target}
                        color="green"
                    />
                    <MetricCard
                        title="Open Positions"
                        value={metrics.activeJobs}
                        trend={metrics.jobsTrend}
                        icon={Briefcase}
                        color="purple"
                    />
                    <MetricCard
                        title="Hires This Month"
                        value={metrics.hiredThisMonth}
                        trend={metrics.hiresTrend}
                        icon={TrendingUp}
                        color="orange"
                    />
                </div>

                {/* Needs attention — real counts, no trend badge: these are
                    point-in-time queues, not month-over-month metrics. */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href="/applications" className="block">
                        <MetricCard
                            title="Interviews Today"
                            value={attention.interviewsToday}
                            icon={CalendarClock}
                            color="blue"
                        />
                    </Link>
                    <Link href="/applications" className="block">
                        <MetricCard
                            title="Awaiting Feedback"
                            value={attention.awaitingFeedback}
                            icon={Clock}
                            color="orange"
                        />
                    </Link>
                    <Link href="/applications" className="block">
                        <MetricCard
                            title="Pending Holds"
                            value={attention.pendingHolds}
                            icon={Hourglass}
                            color="purple"
                        />
                    </Link>
                    <Link href="/jobs?tab=drafts" className="block">
                        <MetricCard
                            title="Draft Jobs"
                            value={attention.draftJobs}
                            icon={FileText}
                            color="green"
                        />
                    </Link>
                </div>

                {/* Analytics Overview */}
                <AnalyticsOverview
                    data={{ applications: applicationTrend }}
                    range={trendRange}
                    onRangeChange={handleRangeChange}
                    className='bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group'
                />

                {/* Job Pipeline — the view toggle above switches this section
                    between grid cards and a compact list. Previously the
                    toggle changed nothing, and this data was fetched but
                    never rendered. */}
                <div className="space-y-3">
                    <div className="flex flex-row items-center justify-between">
                        <h2 className='text-xs font-bold text-brand-dark/40 uppercase tracking-widest'>Job Pipeline</h2>
                        <p className="text-[11px] text-muted-foreground font-bold">
                            {statusCounts.length > 0 ? statusCounts.join(' · ') : 'No jobs yet'}
                        </p>
                    </div>

                    {jobPipeline.length === 0 ? (
                        <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                            <p className="text-xs text-muted-foreground mb-3">
                                No open jobs yet — publish a job to see its pipeline here.
                            </p>
                            <Link href="/jobs/new" className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm">
                                Post a Job
                            </Link>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {jobPipeline.map((job) => {
                                const maxStage = Math.max(1, ...job.stages.map((stage) => stage.count));
                                return (
                                    <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="block bg-card border border-border rounded-md p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-sm font-bold text-foreground truncate tracking-tight">{job.jobTitle}</h4>
                                            <span className="text-[11px] text-muted-foreground font-bold shrink-0">
                                                {job.totalApplications} applicant{job.totalApplications === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {job.stages.map((stage) => (
                                                <div key={stage.name} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                                    <span className="text-[11px] font-bold text-muted-foreground w-28 truncate">{stage.name}</span>
                                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${Math.round((stage.count / maxStage) * 100)}%`, backgroundColor: stage.color }} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-muted-foreground w-6 text-right">{stage.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-md shadow-sm divide-y divide-border">
                            {jobPipeline.map((job) => (
                                <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted transition-all">
                                    <span className="text-sm font-bold text-foreground truncate flex-1">{job.jobTitle}</span>
                                    <span className="text-[11px] text-muted-foreground font-bold shrink-0">
                                        {job.totalApplications} applicant{job.totalApplications === 1 ? '' : 's'}
                                    </span>
                                    <span className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground font-bold">
                                        {job.stages.map((stage) => (
                                            <span key={stage.name} className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                                {stage.name} {stage.count}
                                            </span>
                                        ))}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    <p className="text-[11px] text-muted-foreground font-bold">
                        {attention.timeToHire.avgDays !== null
                            ? `Average time to hire: ${attention.timeToHire.avgDays} days across ${attention.timeToHire.hires} hire${attention.timeToHire.hires === 1 ? '' : 's'} (${attention.timeToHire.buckets.filter((bucket) => bucket.count > 0).map((bucket) => `${bucket.range}: ${bucket.count}`).join(' · ')})`
                            : 'No hires yet — average time to hire will appear after your first hire.'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col xl:col-span-4 gap-4 py-4">
                {/*  Upcoming Interviews */}
                <Card className="md:col-span-2 bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle
                                    className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Schedule</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="w-full min-h-[290px]">
                        <StripCalendar interviews={upcomingInterviews} />
                    </CardContent>
                </Card>

                {/* Activity — reads the real activity_log, so deletes and
                    stage moves show up here too. */}
                <Card className="md:col-span-2 bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Recent
                                Activity</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No activity yet — publishing a job, moving a candidate to a
                                new stage, or scheduling an interview will show up here.
                            </p>
                        ) : (
                            recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className={cn("flex items-center space-x-3 px-2 py-1.5 rounded-md", getActivityColor(activity.entity_type).split(" ")[0])}
                                >
                                    <div className={cn("p-2 rounded-full", getActivityColor(activity.entity_type))}>
                                        {getActivityIcon(activity.entity_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs tracking-tight font-bold truncate">
                                            {activity.actor_name} {ACTION_LABELS[activity.action] ?? activity.action} — {activity.summary}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {time_ago(activity.created_at)}
                                        </p>
                                    </div>
                                    {activity.entity_href && (
                                        <Link href={activity.entity_href} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline shrink-0">
                                            View
                                        </Link>
                                    )}
                                </div>
                            ))
                        )}
                        <Button
                            variant="ghost"
                            asChild
                            className="w-full text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary hover:bg-transparent transition-colors border-t border-foreground/5 pt-6">
                            <Link href="/activity">View all activity</Link>
                        </Button>
                    </CardContent>
                </Card>

                <ApplicationBreakdown
                    data={recruitmentFunnel}
                    totalApplications={metrics.totalApplications}
                    className="md:col-span-2 bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group"
                />

                <QuickActions />
            </div>
        </div>
    );
};

export default Dashboard;
