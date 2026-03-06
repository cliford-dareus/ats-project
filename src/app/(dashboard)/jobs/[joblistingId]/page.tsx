import React from "react";
import {get_job_listings_stages} from "@/server/queries/drizzle/job-listings";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {auth} from "@clerk/nextjs/server";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import CreateApplicationModal from "@/components/modal/create-application-modal";
import {
    get_all_job_listings_action,
    get_job_by_id_action,
} from "@/server/actions/job-listings-actions";
import {
    ApplicationType,
    CandidatesResponseType, JobListing,
    JobResponseType,
    StageResponseType,
} from "@/types";
import {get_all_candidates_action} from "@/server/actions/candidates-actions";
import JobTabs from "@/app/(dashboard)/jobs/[joblistingId]/_components/Job-tabs";

type Props = {
    params: {
        joblistingId: string;
        organizationId: string;
    };
};

const Page = async ({params}: Props) => {
    const {joblistingId} = await params;
    const {orgId} = await auth();
    if (!orgId) return;

    const [
        jobsResponse,
        singleJobResponse,
        candidatesResponse,
        stagesResponse,
    ] = await Promise.all([
        get_all_job_listings_action({organization: orgId}),
        get_job_by_id_action(Number(joblistingId)),
        get_all_candidates_action({limit: 1000, offset: 0}),
        get_job_listings_stages(Number(joblistingId)),
    ]);

    const jobs = Array.isArray(jobsResponse) ? jobsResponse[1] : [];
    const candidates = Array.isArray(candidatesResponse) ? candidatesResponse[1] : [];
    const singleJob = (Array.isArray(singleJobResponse) ? singleJobResponse : [])[0];
    const stages = Array.isArray(stagesResponse) ? stagesResponse : [];

    console.log(singleJob)

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between w-full p-4">
                <div>
                    <div className="flex flex-col">
                        <div className="">
                            <Badge className="bg-green-100 text-xs text-green-500 font-normal shadow-none">
                                {singleJob.job_status}
                            </Badge>
                            <h1 className="text-2xl font-bold text-zinc-900 leading-tight">{singleJob.job_name.toUpperCase()}</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500 mt-1 font-medium">{singleJob.job_department}</span>
                            <span className="text-zinc-300 ml-2 mt-1">•</span>
                            <span className="text-zinc-500 mt-1 font-medium">{singleJob.job_location}</span>
                            <span className="text-zinc-300 ml-2 mt-1">•</span>
                            <span className="text-zinc-500 mt-1 font-medium">
                                Published on{" "}{new Date(singleJob.job_created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Add Applicant</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <CreateApplicationModal
                                job={jobs as JobResponseType[]}
                                candidates={candidates as CandidatesResponseType[]}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <JobTabs
                jobs={jobs as JobResponseType[]}
                stages={stages as StageResponseType[]}
                joblistingId={joblistingId}
                applications={singleJob.applications as ApplicationType[]}
                singleJob={singleJob as JobListing}
            />
        </div>
    );
};

export default Page;
