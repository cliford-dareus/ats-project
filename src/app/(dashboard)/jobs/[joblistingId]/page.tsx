import React from 'react';
import {get_job_listing_with_candidate, get_job_listings_stages} from "@/server/db/job-listings";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {BriefcaseBusiness, CircleUser, Edit} from "lucide-react";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import CreateApplicationModal from "@/components/modal/create-application-modal";
import {get_all_job_listings_action} from "@/server/actions/job-listings-actions";
import {
    candidatesResponseType,
    JobListingWithCandidatesType,
    JobResponseType,
    StageResponseType
} from "@/types/job-listings-types";
import {get_all_candidates_action} from "@/server/actions/candidates-actions";
import JobOptions from "@/app/(dashboard)/jobs/[joblistingId]/_components/job-options";
import JobPipeline from "@/app/(dashboard)/jobs/[joblistingId]/_components/job-pipeline";
import {auth} from "@clerk/nextjs/server";

type Props = {
    params: {
        joblistingId: string;
        organizationId: string;
    }
};

const Page = async ({params}: Props) => {
    const {joblistingId} = await params;
    const {orgId}= await auth();
    if (!orgId) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const [, jobs] = await get_all_job_listings_action({ organization: orgId});
    // Change fn name to get_application_info or something
    const applications = await get_job_listing_with_candidate(Number(joblistingId));
    const candidates = await get_all_candidates_action();
    const stages = await get_job_listings_stages(applications[0]?.job_id);

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <h1 className="font-bold text-xl">{applications[0]?.job_name}</h1>
                            <Badge className="bg-green-100 text-xs text-green-500 font-normal shadow-none">
                                {applications[0].job_status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">
                                Published on {applications[0]?.job_created_at.toString().split(' ').slice(0, 3).join(' ')}
                            </p>
                        </div>
                    </div>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Add Applicant</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <CreateApplicationModal
                            job={jobs as JobResponseType[]}
                            candidates={candidates as candidatesResponseType[]}
                        />
                    </DialogContent>
                </Dialog>
            </div>

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

export default Page;