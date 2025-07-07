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
    CandidatesResponseType,
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
    const singleJob = Array.isArray(singleJobResponse) ? singleJobResponse : [];
    const stages = Array.isArray(stagesResponse) ? stagesResponse : [];

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <h1 className="font-bold text-xl">{singleJob[0].job_name}</h1>
                            <Badge className="bg-green-100 text-xs text-green-500 font-normal shadow-none">
                                {singleJob[0].job_status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">
                                Published
                                on{" "}{singleJob[0].job_created_at.toString().split(" ").slice(0, 3).join(" ")}
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
                            candidates={candidates as CandidatesResponseType[]}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <JobTabs
                job_name={singleJob[0].job_name}
                jobs={jobs as JobResponseType[]}
                stages={stages as StageResponseType[]}
                joblistingId={joblistingId}
                applications={singleJob[0].applications as ApplicationType[]}
            />
        </div>
    );
};

export default Page;
