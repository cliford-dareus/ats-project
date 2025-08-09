"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Briefcase,
    TrendingUp,
    CheckCircle,
    Target,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Plus,
    Filter,
    Calendar
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import QuickActions from "./quick-actions";
import PerformanceMetrics from "./performance-metrics";
import AnalyticsOverview from "./analytics-overview";
import DashboardSummary from "./dashboard-summary";

interface DashboardMetrics {
    totalApplications: number;
    totalCandidates: number;
    activeJobs: number;
    hiredThisMonth: number;
    applicationsTrend: number;
    candidatesTrend: number;
    jobsTrend: number;
    hiresTrend: number;
};

interface RecentActivity {
    id: string;
    type: 'application' | 'interview' | 'hire' | 'job_posted';
    candidate?: string;
    job?: string;
    timestamp: Date;
    status?: string;
};

export interface UpcomingInterview {
    id: string;
    candidateName: string;
    candidateAvatar?: string;
    jobTitle: string;
    time: Date;
    type: 'phone' | 'video' | 'in-person';
};

interface JobPipelineData {
    jobTitle: string;
    totalApplications: number;
    stages: {
        name: string;
        count: number;
        color: string;
    }[];
};

type Props = {
    metrics: DashboardMetrics;
    recentActivity: RecentActivity[];
    upcomingInterviews: UpcomingInterview[];
    jobPipeline: JobPipelineData[];
    userName: string;
};

const Dashboard = ({
    metrics,
    recentActivity,
    upcomingInterviews,
    jobPipeline,
    userName
}: Props) => {
    const [timeOfDay, setTimeOfDay] = useState('');

    // Sample analytics data - in real app, this would come from props or API
    const analyticsData = {
        applications: [
            { date: '2024-01-01', count: 45 },
            { date: '2024-01-02', count: 52 },
            { date: '2024-01-03', count: 38 },
            { date: '2024-01-04', count: 61 },
            { date: '2024-01-05', count: 49 },
            { date: '2024-01-06', count: 67 },
            { date: '2024-01-07', count: 58 }
        ],
        hires: [
            { date: '2024-01-01', count: 3 },
            { date: '2024-01-02', count: 5 },
            { date: '2024-01-03', count: 2 },
            { date: '2024-01-04', count: 4 },
            { date: '2024-01-05', count: 6 },
            { date: '2024-01-06', count: 3 },
            { date: '2024-01-07', count: 4 }
        ],
        sources: [
            { name: 'LinkedIn', value: 145, color: '#0077B5' },
            { name: 'Indeed', value: 98, color: '#2557A7' },
            { name: 'Company Website', value: 76, color: '#00C49F' },
            { name: 'Referrals', value: 54, color: '#FFBB28' },
            { name: 'Other', value: 32, color: '#FF8042' }
        ],
        stages: [
            { stage: 'Applied', count: 234, conversion: 100 },
            { stage: 'Screening', count: 156, conversion: 67 },
            { stage: 'Interview', count: 89, conversion: 57 },
            { stage: 'Final Round', count: 34, conversion: 38 },
            { stage: 'Offer', count: 18, conversion: 53 },
            { stage: 'Hired', count: 12, conversion: 67 }
        ]
    };

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay('morning');
        else if (hour < 17) setTimeOfDay('afternoon');
        else setTimeOfDay('evening');
    }, []);

    const MetricCard = ({
        title,
        value,
        trend,
        icon: Icon,
        color = "blue"
    }: {
        title: string;
        value: number;
        trend: number;
        icon: React.ComponentType<{ className?: string }>;
        color?: string;
    }) => (
        <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", `text-${color}-600`)} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    {trend > 0 ? (
                        <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                    ) : (
                        <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                    )}
                    <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(trend)}%
                    </span>
                    <span className="ml-1">from last month</span>
                </div>
            </CardContent>
        </Card>
    );

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'application': return <Users className="h-4 w-4" />;
            case 'interview': return <Calendar className="h-4 w-4" />;
            case 'hire': return <CheckCircle className="h-4 w-4" />;
            case 'job_posted': return <Briefcase className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'application': return 'bg-blue-100 text-blue-600';
            case 'interview': return 'bg-yellow-100 text-yellow-600';
            case 'hire': return 'bg-green-100 text-green-600';
            case 'job_posted': return 'bg-purple-100 text-purple-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="flex  gap-6 p-6">
            <div className=" space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Good {timeOfDay}, {userName}
                        </h1>
                        <p className="text-muted-foreground">
                            Here&apos;s what&apos;s happening with your recruitment today.
                        </p>
                    </div>
                    {/* <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            New Job
                        </Button>
                    </div> */}
                </div>

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

                {/* Additional Dashboard Sections */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Action Items Summary */}
                    <DashboardSummary className="lg:col-span-1" />

                    {/* Quick Actions */}
                    <QuickActions upcomingInterviews={upcomingInterviews} />

                    {/* Performance Metrics */}
                    {/* <PerformanceMetrics /> */}
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Action Items Summary */}
                    {/* <DashboardSummary className="lg:col-span-1" /> */}

                    {/* Recent Activity */}
                    {/* <Card className="md:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest updates from your recruitment pipeline</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentActivity.slice(0, 5).map((activity) => (
                                <div key={activity.id} className="flex items-center space-x-3">
                                    <div className={cn("p-2 rounded-full", getActivityColor(activity.type))}>
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {activity.candidate && `${activity.candidate} `}
                                            {activity.type === 'application' && 'applied for'}
                                            {activity.type === 'interview' && 'scheduled interview for'}
                                            {activity.type === 'hire' && 'was hired for'}
                                            {activity.type === 'job_posted' && 'New job posted:'}
                                            {activity.job && ` ${activity.job}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.timestamp.toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full" asChild>
                                <Link href="/activity">View all activity</Link>
                            </Button>
                        </CardContent>
                    </Card> */}

                    {/* Upcoming Interviews */}
                    {/* <Card className="md:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Upcoming Interviews</CardTitle>
                                <CardDescription>Scheduled for the next 7 days</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm">
                                <Calendar className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {upcomingInterviews.slice(0, 4).map((interview) => (
                                <div key={interview.id} className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={interview.candidateAvatar} />
                                        <AvatarFallback>
                                            {interview.candidateName.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {interview.candidateName}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {interview.jobTitle}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium">
                                            {interview.time.toLocaleDateString()}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                            {interview.type}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full" asChild>
                                <Link href="/interviews">View all interviews</Link>
                            </Button>
                        </CardContent>
                    </Card> */}

                    {/* Job Pipeline Overview */}
                    {/* <Card className="md:col-span-1 lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Pipeline Overview</CardTitle>
                            <CardDescription>Applications by stage across all jobs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {jobPipeline.slice(0, 3).map((job, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate">{job.jobTitle}</p>
                                        <span className="text-xs text-muted-foreground">
                                            {job.totalApplications} total
                                        </span>
                                    </div>
                                    <div className="flex space-x-1">
                                        {job.stages.map((stage, stageIndex) => (
                                            <div
                                                key={stageIndex}
                                                className="flex-1 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: stage.color,
                                                    opacity: stage.count > 0 ? 1 : 0.3
                                                }}
                                                title={`${stage.name}: ${stage.count}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full" asChild>
                                <Link href="/jobs">View all jobs</Link>
                            </Button>
                        </CardContent>
                    </Card> */}
                </div>

                {/* Analytics Overview */}
                <AnalyticsOverview data={analyticsData} />
            </div>

            <div className="flex flex-col gap-6 p-6 border bg-slate-100 rounded-lg">
                 <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest updates from your recruitment pipeline</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-center space-x-3">
                                <div className={cn("p-2 rounded-full", getActivityColor(activity.type))}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {activity.candidate && `${activity.candidate} `}
                                        {activity.type === 'application' && 'applied for'}
                                        {activity.type === 'interview' && 'scheduled interview for'}
                                        {activity.type === 'hire' && 'was hired for'}
                                        {activity.type === 'job_posted' && 'New job posted:'}
                                        {activity.job && ` ${activity.job}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.timestamp.toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full" asChild>
                            <Link href="/activity">View all activity</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/*  Upcoming Interviews */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Upcoming Interviews</CardTitle>
                            <CardDescription>Scheduled for the next 7 days</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                            <Calendar className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingInterviews.slice(0, 4).map((interview) => (
                            <div key={interview.id} className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={interview.candidateAvatar} />
                                    <AvatarFallback>
                                        {interview.candidateName.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {interview.candidateName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {interview.jobTitle}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium">
                                        {interview.time.toLocaleDateString()}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                        {interview.type}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full" asChild>
                            <Link href="/interviews">View all interviews</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/*  Quick Actions */}
                <QuickActions upcomingInterviews={upcomingInterviews} />
            </div>
        </div>
    );
};

export default Dashboard;
