"use client";

import React, { useCallback, useEffect } from 'react';
import { CustomTabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
    FileText,
    User
} from "lucide-react";
import ReportHistory from './report-history';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ReportOverview from './report-overview';
import { JOB_STAGES, JOB_STATUS } from '@/zod';


export interface ReportData {
    summary: {
        totalApplications: number;
        totalCandidates: number;
        totalJobs: number;
        totalInterviews: number;
        hiredCandidates: number;
    };
    trends: {
        applicationsByDate: Array<{ date: string; count: number }>;
        monthlyTrends: Array<{ month: string; applications: number }>;
    };
    breakdown: {
        applicationsByJob: Array<{
            jobTitle: string;
            jobId: number;
            count: number;
            job_status: typeof JOB_STATUS._type | null;
            job_created_at: Date;
            job_location: string;
            job_department: number;
        }>;
        applicationsByStage: Array<{ stageName: typeof JOB_STAGES._type | null; stageOrder: number; count: number; stageColor: string | null }>;
    };
    analysis: {
        sourceAnalysis: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
        timeToHireData: Array<{ range: string; count: number }>;
        diversityMetrics: {
            gender: Array<{ category: string; count: number; percentage: number }>;
            experience: Array<{ category: string; count: number; percentage: number }>;
        };
        performanceMetrics: {
            averageTimeToHire: number;
            applicationToInterviewRate: number;
            interviewToOfferRate: number;
            offerAcceptanceRate: number;
            costPerHire: number;
            qualityOfHire: number;
        };
    };
};

interface Props {
    reportData: ReportData;
};

type TabValue = "overview" | "history";
const DEFAULT_TAB: TabValue = "overview";

const ReportsComponent = ({ reportData }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TAB);

    // const quickStats = [
    //     {
    //         title: 'Total Applications',
    //         value: reportData.summary.totalApplications,
    //         icon: Users,
    //         color: 'text-blue-600',
    //         bgColor: 'bg-blue-100'
    //     },
    //     {
    //         title: 'Active Candidates',
    //         value: reportData.summary.totalCandidates,
    //         icon: Target,
    //         color: 'text-green-600',
    //         bgColor: 'bg-green-100'
    //     },
    //     {
    //         title: 'Open Positions',
    //         value: reportData.summary.totalJobs,
    //         icon: Briefcase,
    //         color: 'text-purple-600',
    //         bgColor: 'bg-purple-100'
    //     },
    //     {
    //         title: 'Interviews Scheduled',
    //         value: reportData.summary.totalInterviews,
    //         icon: Calendar,
    //         color: 'text-orange-600',
    //         bgColor: 'bg-orange-100'
    //     },
    //     {
    //         title: 'Successful Hires',
    //         value: reportData.summary.hiredCandidates,
    //         icon: TrendingUp,
    //         color: 'text-emerald-600',
    //         bgColor: 'bg-emerald-100'
    //     }
    // ];

    const handleTabChange = useCallback((value: string) => {
        const newPath = value === DEFAULT_TAB
            ? pathname
            : `${pathname}?tab=${value}`;
        router.push(newPath);
    }, [pathname, router]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div className="my-6">
            <div className="flex">
                <Tabs className="px-0 h-full w-full" defaultValue="overview" value={activeTab}
                    onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                        <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                            {[
                                { id: 'overview', label: 'Overview', icon: User },
                                { id: 'history', label: 'History', icon: FileText },
                            ].map((tab) => (
                                <CustomTabsTrigger
                                    key={tab.id}
                                    className="px-4 flex items-center gap-4 py-2 rounded-lg text-xs font-bold transition-all text-[10px] uppercase tracking-widest"
                                    value={tab.id}
                                >
                                    <tab.icon size={18} />
                                    <p>{tab.label}</p>
                                </CustomTabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <TabsContent value="overview">
                        <ReportOverview reportData={reportData} />
                    </TabsContent>

                    <TabsContent value="history">
                        <ReportHistory />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ReportsComponent;
