"use client";

import React, { useEffect, useCallback } from "react";
import { BriefcaseBusiness, CircleUser, Edit3, Settings, Share2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import JobPipeline from "./job-pipeline";
import JobOptions from "./job-options";
import {
    CustomTabsTrigger,
    Tabs,
    TabsContent,
    TabsList,
} from "@/components/ui/tabs";
import {
    ApplicationType,
    JobListingType,
    JobResponseType,
    StageResponseType,
} from "@/types";
import JobCandidate from "./job-candidate";

type Props = {
    applications: ApplicationType[];
    stages: StageResponseType[];
    jobs: JobResponseType[];
    jobListingId: string;
    singleJob: JobListingType;
};

type TabValue = "candidates" | "pipelines" | "options";
const DEFAULT_TAB: TabValue = "candidates";

const JobTabs = ({ applications, stages, jobs, jobListingId, singleJob }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TAB);

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
        <div className="h-full">
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" value={activeTab} onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                        <TabsList className="bg-transparent rounded-none p-0 justify-start">
                            {['candidates', 'pipelines', 'options'].map((tab) => (
                                <CustomTabsTrigger
                                    key={tab}
                                    className="px-4 flex items-center gap-4 py-2 rounded-lg text-xs font-bold transition-all"
                                    value={tab}
                                >
                                    {tab === 'options' ? <BriefcaseBusiness size={20} /> : <CircleUser size={20} />}
                                    <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
                                </CustomTabsTrigger>
                            ))}
                        </TabsList>
                        <div className="flex items-center gap-6">
                            <button
                                className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary transition-colors">
                                <Share2 size={14} />
                                Share
                            </button>
                            <button
                                className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary transition-colors">
                                <Settings size={14} />
                                Setting
                            </button>
                            <button
                                className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary transition-colors">
                                <Edit3 size={14} />
                                Edit Job Ad
                            </button>
                        </div>
                    </div>

                    <TabsContent value="candidates" >
                        <JobCandidate job={singleJob} stages={stages} />
                    </TabsContent>
                    <TabsContent value="pipelines">
                        <JobPipeline
                            data={applications}
                            stages={stages}
                            jobDetails={{ jobName: singleJob.job_name, department: singleJob.job_department }}
                        />
                    </TabsContent>
                    <TabsContent value="options">
                        <JobOptions job_id={Number(jobListingId)} data={jobs} stages={stages} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default JobTabs;
