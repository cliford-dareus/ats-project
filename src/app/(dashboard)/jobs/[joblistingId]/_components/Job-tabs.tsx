"use client";

import React, { useEffect, useCallback, useState } from "react";
import { BriefcaseBusiness, CircleUser, Edit3, Settings, Share2, Table2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import JobPipeline from "./job-pipeline";
import JobOptions from "./job-options";
import EditJobListingModal from "@/components/modal/edit-joblisting-modal";
import { buildCareerApplyUrl, copyTextToClipboard } from "@/lib/job-display";
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
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

    // The edit modal takes the list-shaped job row; the detail-shaped
    // singleJob lacks salary/organization, so map from the jobs prop.
    const currentJob = jobs.find((job) => job.id === Number(jobListingId));

    const handleTabChange = useCallback((value: string) => {
        const newPath = value === DEFAULT_TAB
            ? pathname
            : `${pathname}?tab=${value}`;
        router.push(newPath);
    }, [pathname, router]);

    // Share copies the public apply link for this job on the org's career
    // subdomain — the same URL construction the organization settings
    // page uses for the career page.
    const handleShare = useCallback(async () => {
        const url = buildCareerApplyUrl(singleJob.job_subdomain, Number(jobListingId));
        const ok = await copyTextToClipboard(url);
        setShareState(ok ? "copied" : "failed");
        window.setTimeout(() => setShareState("idle"), 2500);
    }, [singleJob.job_subdomain, jobListingId]);

    const handleEditJobAd = useCallback(() => {
        if (currentJob) {
            setIsEditJobOpen(true);
        } else {
            // No list row to edit — fall back to the options tab.
            handleTabChange("options");
        }
    }, [currentJob, handleTabChange]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div className="h-[calc(100vh-210px)] overflow-hidden">
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" value={activeTab} onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <TabsList className="bg-transparent rounded-none p-0 justify-start">
                            {['candidates', 'pipelines', 'options'].map((tab) => (
                                <CustomTabsTrigger
                                    key={tab}
                                    className="px-4 flex items-center gap-4 py-2 rounded-lg text-xs font-bold transition-all text-[10px] uppercase tracking-widest"
                                    value={tab}
                                >
                                    {tab == 'pipelines' ? <Table2 size={18} /> : tab == 'options' ? <BriefcaseBusiness size={18} /> : <CircleUser size={18} />}
                                    <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
                                </CustomTabsTrigger>
                            ))}
                        </TabsList>
                        <div className="flex items-center gap-6">
                            <button
                                type="button"
                                onClick={handleShare}
                                className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary transition-colors">
                                <Share2 size={14} />
                                {shareState === "copied" ? "Copied!" : shareState === "failed" ? "Copy failed" : "Share"}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange("options")}
                                className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest hover:text-primary transition-colors">
                                <Settings size={14} />
                                Setting
                            </button>
                            <button
                                type="button"
                                onClick={handleEditJobAd}
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
                            jobDetails={{
                                jobId: Number(jobListingId),
                                jobName: singleJob.job_name,
                                department: singleJob.job_department
                            }}
                        />
                    </TabsContent>
                    <TabsContent value="options">
                        <JobOptions job_id={Number(jobListingId)} data={jobs} stages={stages} />
                    </TabsContent>
                </Tabs>
            </div>
            {currentJob && (
                <EditJobListingModal isEditJobOpen={isEditJobOpen} setIsEditJobOpen={setIsEditJobOpen} data={currentJob} />
            )}
        </div>
    );
};

export default JobTabs;
