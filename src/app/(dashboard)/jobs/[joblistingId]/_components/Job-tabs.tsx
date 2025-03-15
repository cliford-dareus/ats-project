"use client";

import React, { useEffect, useCallback } from "react";
import { BriefcaseBusiness, CircleUser } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import JobPipeline from "./job-pipeline";
import JobOptions from "./job-options";
import {
    CustomTabsTrigger,
    Tabs,
    TabsContent,
    TabsList,
} from "@/components/ui/tabs";
import { useTriggers } from "@/providers/trigger-provider";
import {
    ApplicationType,
    JobResponseType,
    StageResponseType,
} from "@/types";
import JobCandidate from "./job-candidate";

type Props = {
    applications: ApplicationType[];
    stages: StageResponseType[];
    jobs: JobResponseType[];
    joblistingId: string;
};

type TabValue = "candidates" | "pipelines" | "options";
const DEFAULT_TAB: TabValue = "candidates";

const JobTabs = ({ applications, stages, jobs, joblistingId }: Props) => {
    const { initializeTrigger } = useTriggers();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TAB);

    useEffect(() => {
        if (applications.length > 0) {
            console.log("applications", applications)
            initializeTrigger(applications[0].job_id);
        }
    }, [initializeTrigger, applications]);

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
        <div>
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                        {['candidates', 'pipelines', 'options'].map((tab) => (
                            <CustomTabsTrigger
                                key={tab}
                                className="px-4 flex items-center gap-4"
                                value={tab}
                            >
                                {tab === 'options' ? <BriefcaseBusiness size={20} /> : <CircleUser size={20} />}
                                <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
                            </CustomTabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="candidates">
                      <JobCandidate data={applications}/>
                    </TabsContent>
                    <TabsContent value="pipelines">
                        <JobPipeline data={applications} stages={stages} />
                    </TabsContent>
                    <TabsContent value="options">
                        <JobOptions job_id={Number(joblistingId)} data={jobs} stages={stages} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default JobTabs;