'use client'

import React, {useState} from 'react';
import {BriefcaseBusiness, CircleUser} from "lucide-react";
import Link from "next/link";
import JobPipeline from "@/app/(dashboard)/jobs/[joblistingId]/_components/job-pipeline";
import {JobListingWithCandidatesType, JobResponseType, StageResponseType} from "@/types/job-listings-types";
import JobOptions from "@/app/(dashboard)/jobs/[joblistingId]/_components/job-options";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";

type  Props = {
    applications: JobListingWithCandidatesType[];
    stages: StageResponseType[];
    jobs: JobResponseType[];
    joblistingId: string;
}

const JobTabs = ({applications, stages, jobs, joblistingId}: Props) => {
    const [] = useState()
    return (
        <div>
            <div className="flex px-4">
                <Tabs className="px-0 h-full w-full" defaultValue="candidates">
                    <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="candidates">
                            <CircleUser size={20}/>
                            <p>Candidates</p>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="pipelines">
                            <CircleUser size={20}/>
                            <p>Pipelines</p>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="options">
                            <BriefcaseBusiness size={20}/>
                            <p>Options</p>
                        </CustomTabsTrigger>
                    </TabsList>

                    <TabsContent value="candidates">
                        Candidates
                        <Link href={`/jobs/${joblistingId}/review/${3}`}>
                            <CircleUser size={20}/>
                            <p>Candidates</p>
                        </Link>
                    </TabsContent>
                    <TabsContent value="pipelines">
                        <JobPipeline
                            data={applications as JobListingWithCandidatesType[]}
                            stages={stages as StageResponseType[]}
                        />
                    </TabsContent>
                    <TabsContent value="options">
                        <JobOptions
                            job_id={Number(joblistingId)}
                            data={jobs as JobResponseType[]}
                            stages={stages as StageResponseType[]}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default JobTabs;