"use client";

import React, { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Briefcase,
    TrendingUp,
    CheckCircle,
    Target,
    Activity,
    MoreHorizontal,
    Calendar,
    LayoutGrid,
    List,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnalyticsOverview from "./analytics-overview";
import StripCalendar from "@/components/strip-calenda";
import MetricCard from "@/components/metric-card";
import ApplicationBreakdown from './application-breakdown';

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

export interface RecruitmentFunnel {
    stage: "Applied" | "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | 'Hired' | "Drafted";
    count: number;
    stageColor: string;
    conversion: number;
};

type Props = {
    metrics: DashboardMetrics;
    recentActivity: RecentActivity[];
    upcomingInterviews: UpcomingInterview[];
    jobPipeline: JobPipelineData[];
    recruitmentFunnel: RecruitmentFunnel[];
    applicationTrend: { date: string, count: number }[]
    userName: string;
};

const Dashboard = ({
    metrics,
    recentActivity,
    upcomingInterviews,
    // jobPipeline,
    recruitmentFunnel,
    applicationTrend,
    userName
}: Props) => {
    const [timeOfDay, setTimeOfDay] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    // Sample analytics data - in real app, this would come from props or API
    const analyticsData = {
        applications: applicationTrend,
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
        stages: recruitmentFunnel
    };

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay('morning');
        else if (hour < 17) setTimeOfDay('afternoon');
        else setTimeOfDay('evening');
    }, []);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'application':
                return <Users className="h-4 w-4" />;
            case 'interview':
                return <Calendar className="h-4 w-4" />;
            case 'hire':
                return <CheckCircle className="h-4 w-4" />;
            case 'job_posted':
                return <Briefcase className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'application':
                return 'bg-blue-100 text-blue-600';
            case 'interview':
                return 'bg-yellow-100 text-yellow-600';
            case 'hire':
                return 'bg-green-100 text-green-600';
            case 'job_posted':
                return 'bg-purple-100 text-purple-600';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };


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
                        <div className="flex bg-white border border-slate-200 p-1.5 rounded-md shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List size={14} />
                            </button>
                        </div>
                        {/* <button
                            // onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-[1.25rem] font-black text-s transition-all shadow-2xl shadow-blue-200"
                        >
                            <Plus size={14} />
                            New Automation
                        </button> */}
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

                {/* Analytics Overview */}
                <AnalyticsOverview data={analyticsData} className='bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group' />

                {/* Recent Views */}
                <div className="space-y-3">
                    <div className="flex flex-row items-center justify-between">
                        <h2 className='text-xs font-bold text-brand-dark/40 uppercase tracking-widest'>Previously Viewed
                            Applications</h2>

                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center space-x-3 border-b border-slate-200">
                        <motion.div
                            layout
                            // layoutId={candidate.id}
                            whileHover={{ y: -4 }}
                            className="group bg-white border border-slate-200 rounded-md p-4 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 cursor-pointer"
                        >
                            <div className="flex gap-6 items-center">
                                <div className="relative flex-shrink-0">
                                    <div
                                        className="w-12 h-12 rounded-[1.25rem] overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-100 group-hover:rotate-3 transition-transform duration-500">
                                        <Avatar>
                                            <AvatarImage alt="" />
                                            <AvatarFallback></AvatarFallback>
                                        </Avatar>
                                    </div>
                                    {/* {hasActiveTrigger && ( */}
                                    <div
                                        className="absolute -top-1 -right-2 bg-primary text-white p-1.5 rounded-xl shadow-lg border-2 border-white animate-bounce">
                                        <Zap size={12} fill="currentColor" />
                                    </div>
                                    {/* )} */}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">John
                                                Doe</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Software
                                                Engineer</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div
                                    className={`px-4 py-1 rounded-xl border text-[10px] font-semibold uppercase tracking-[0.2em]`}>
                                    Active
                                </div>
                                <div
                                    className="flex items-center gap-2 text-[11px] text-slate-500 font-bold bg-slate-50 px-4 py-1 rounded-xl">
                                    <Calendar size={12} className="text-blue-500" />
                                    New Candidate
                                </div>
                            </div>
                        </motion.div>
                    </div>
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
                                {/*<CardDescription className="">Manage your upcoming candidate meetings</CardDescription>*/}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className='hover:bg-primary/10'>
                            <MoreHorizontal className="h-4 w-4 text-primary" />
                        </Button>
                    </CardHeader>
                    <CardContent className="w-full min-h-[290px]">
                        <StripCalendar interviews={upcomingInterviews} />
                    </CardContent>
                </Card>

                {/* Activity */}
                <Card className="md:col-span-2 bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Recent
                                Activity</CardTitle>
                            {/*<CardDescription>Latest updates from your recruitment pipeline</CardDescription>*/}
                        </div>
                        <Button variant="ghost" size="sm" className='hover:bg-primary/10'>
                            <MoreHorizontal className="h-4 w-4 text-primary" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.slice(0, 5).map((activity) => (
                            <div
                                key={activity.id}
                                className={cn("flex items-center space-x-3 px-2 py-1.5 rounded-md", getActivityColor(activity.type).split(" ")[0])}
                            >
                                <div className={cn("p-2 rounded-full", getActivityColor(activity.type))}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs tracking-tight font-bold truncate">
                                        {activity.candidate && `${activity.candidate} `}
                                        {activity.type === 'application' && 'applied for'}
                                        {activity.type === 'interview' && 'scheduled interview for'}
                                        {activity.type === 'hire' && 'was hired for'}
                                        {activity.type === 'job_posted' && 'New job posted:'}
                                        {activity.job && ` ${activity.job}`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {activity.timestamp.toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="ghost"
                            className="w-full text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary hover:bg-transparent transition-colors border-t border-foreground/5 pt-6">
                            View all activity
                        </Button>
                    </CardContent>
                </Card>

                <ApplicationBreakdown
                    data={recruitmentFunnel}
                    totalApplications={metrics.totalApplications}
                    className="md:col-span-2 bg-card relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group"
                />

                {/*  Quick Actions */}
                {/*<DashboardSummary className="lg:col-span-1" />*/}
            </div>
        </div>
    );
};

export default Dashboard;
