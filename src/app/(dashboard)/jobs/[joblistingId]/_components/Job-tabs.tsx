"use client";

import React, {useEffect, useCallback} from "react";
import {BriefcaseBusiness, CircleUser, LucideEdit, LucideSettings, LucideTrash, Settings, Share} from "lucide-react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import JobPipeline from "./job-pipeline";
import JobOptions from "./job-options";
import {
    CustomTabsTrigger,
    Tabs,
    TabsContent,
    TabsList,
} from "@/components/ui/tabs";
import {
    ApplicationType, JobListing,
    JobResponseType,
    StageResponseType,
} from "@/types";
import JobCandidate from "./job-candidate";
import {usePluginContextHook} from "@/providers/plugins-provider";
import {pluginRegistry} from "@/lib/plugins-registry";

type Props = {
    applications: ApplicationType[];
    stages: StageResponseType[];
    jobs: JobResponseType[];
    joblistingId: string;
    singleJob: JobListing;
};

type TabValue = "candidates" | "pipelines" | "options";
const DEFAULT_TAB: TabValue = "candidates";

const JobTabs = ({applications, stages, jobs, joblistingId, singleJob}: Props) => {
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
    }, [joblistingId]);

    useEffect(() => {
        const smartTriggers = pluginRegistry.get("smart-triggers");
        if (smartTriggers?.config && typeof smartTriggers.config.actions?.activate === "function" && smartTriggers.enabled) {
            smartTriggers.config.actions?.activate(context);
        }
    }, [context.jobId]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div>
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" value={activeTab} onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-zinc-200">
                        <TabsList className="bg-transparent rounded-none p-0 justify-start">
                            {['candidates', 'pipelines', 'options'].map((tab) => (
                                <CustomTabsTrigger
                                    key={tab}
                                    className="px-4 flex items-center gap-4"
                                    value={tab}
                                >
                                    {tab === 'options' ? <BriefcaseBusiness size={20}/> : <CircleUser size={20}/>}
                                    <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
                                </CustomTabsTrigger>
                            ))}
                        </TabsList>
                        <div className="flex items-center gap-4 text-zinc-500 text-sm">
                            <span className="flex items-center px-2 py-1  rounded-md gap-2"><Share size={16} className=""/> Share</span>
                            <span className="flex items-center px-2 py-1  rounded-md gap-2"><Settings size={16} className=""/> Setting</span>
                            <span className="flex items-center px-2 py-1  rounded-md">Edit Job Ad</span>
                        </div>
                    </div>

                    <TabsContent value="candidates">
                        <JobCandidate job={singleJob}/>
                    </TabsContent>
                    <TabsContent value="pipelines">
                        <JobPipeline data={applications} stages={stages}/>
                    </TabsContent>
                    <TabsContent value="options">
                        <JobOptions job_id={Number(joblistingId)} data={jobs} stages={stages}/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default JobTabs;
