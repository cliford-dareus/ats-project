"use client";

import React, { useEffect, useCallback } from "react";
import { BriefcaseBusiness, CircleUser, LucideEdit, LucideTrash } from "lucide-react";
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
    JobResponseType,
    StageResponseType,
} from "@/types";
import JobCandidate from "./job-candidate";
import { usePluginContextHook } from "@/providers/plugins-provider";
import { getPlugins } from "@/lib/plugins-registry";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { getJobListingsStagesAction } from "@/server/actions/job-listings-actions";

type Props = {
    applications: ApplicationType[];
    stages: StageResponseType[];
    jobs: JobResponseType[];
    joblistingId: string;
    job_name: string;
};

type TabValue = "candidates" | "pipelines" | "options";
const DEFAULT_TAB: TabValue = "candidates";

const JobTabs = ({ applications, stages, jobs, joblistingId, job_name }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const context = usePluginContextHook();
    const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TAB);

    const handleTabChange = useCallback((value: string) => {
        const newPath = value === DEFAULT_TAB
            ? pathname
            : `${pathname}?tab=${value}`;
        router.push(newPath);
    }, [pathname, router]);

    useEffect(() => {
        context.setJobId(joblistingId);
        // const jobId = Number(joblistingId);
        // const fetchTriggers = async () => {
        //     const result = await getJobListingsStagesAction(jobId);
        //     const response = Array.isArray(result) ? result : [];

        //     const parsedTriggers = response.map(cur => ({
        //         id: String(cur.id),
        //         stage: cur.stage_name,
        //         actions: JSON.parse(cur.trigger) as TriggerAction[]
        //     }));
        //     context.setTriggers(parsedTriggers);
        // };
        // fetchTriggers();
    }, [joblistingId]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div>
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" value={activeTab} onValueChange={handleTabChange}>
                  <div className="flex items-center justify-between">
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

                    <div className="flex items-center gap-4">
                      <LucideEdit size={18} />
                      <LucideTrash size={18} />
                    </div>
                  </div>
                    <TabsContent value="candidates">
                      <JobCandidate data={applications} job_name={job_name} />
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
