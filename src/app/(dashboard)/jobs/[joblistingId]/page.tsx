import React from "react";
import { get_job_listings_stages } from "@/server/queries/drizzle/job-listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import CreateApplicationModal from "@/components/modal/create-application-modal";
import {
    get_all_job_listings_action,
    get_job_by_id_action,
} from "@/server/actions/job-listings-actions";
import {
    ApplicationType,
    CandidatesResponseType,
    JobListingType,
    JobResponseType,
    StageResponseType,
} from "@/types";
import { get_all_candidates_action } from "@/server/actions/candidates-actions";
import JobTabs from "@/app/(dashboard)/jobs/[joblistingId]/_components/Job-tabs";
import { KanbanProvider } from "@/providers/kanban-provider";
// import { useServerFlags } from "@/lib/plugins-registry";

import { get_job_all_applications_action } from "@/server/actions/application_actions";
import { cn, getStatusColor } from "@/lib/utils";
// import { smartTriggerLifecycle } from "@/plugins/smart-trigger/lifecycle";

type Props = {
    params: Promise<{
        joblistingId: string;
        organizationId: string;
    }>;
};

const Page = async ({ params }: Props) => {
    const { joblistingId: jobListingId } = await params;
    const { orgId } = await auth();
    if (!orgId) return;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    // const flags = await useServerFlags(orgId);
    const initialTriggers: any[] = [];
    const initialStages: any[] = [];

    const [
        jobsResponse,
        singleJobResponse,
        applicationsResponse,
        candidatesResponse,
        stagesResponse,
    ] = await Promise.all([
        get_all_job_listings_action({ organization: orgId }),
        get_job_by_id_action(Number(jobListingId)),
        get_job_all_applications_action(Number(jobListingId)),
        get_all_candidates_action({ limit: 1000, offset: 0, organization: orgId }),
        get_job_listings_stages(Number(jobListingId)),
    ]);

    const jobs = Array.isArray(jobsResponse) ? jobsResponse[1] : [];
    const candidates = Array.isArray(candidatesResponse) ? candidatesResponse[1] : [];
    const applications = Array.isArray(applicationsResponse) ? applicationsResponse : [];
    const singleJob = (Array.isArray(singleJobResponse) ? singleJobResponse : [])[0];
    const stages = Array.isArray(stagesResponse) ? stagesResponse : [];

    // if (flags["smart-triggers"]) {
    //     const context = {
    //         jobId: jobListingId,
    //         setTriggers: () => { },
    //         setJobStages: () => { },
    //     };
    //     const result = await smartTriggerLifecycle.activate(context);
    //     initialStages = result?.validStagesData || [];
    //     initialTriggers = result?.parsedTriggers || [];
    // }

    return (
        <KanbanProvider
            initialStages={initialStages}
            initialTriggers={initialTriggers}
        >
            <div className="">
                <div className="flex flex-col md:flex-row items-center justify-between w-full p-4 overflow-hidden">
                    <div>
                        <div className="flex flex-col">
                            <div className="">
                                <Badge
                                    className={cn(
                                        "font-normal shadow-none",
                                        getStatusColor(singleJob.job_status!),
                                    )}
                                >
                                    {singleJob.job_status}
                                </Badge>
                                <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
                                    {singleJob.job_name.toUpperCase()}
                                </h1>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500 mt-1 font-medium">
                                    {singleJob.job_department}
                                </span>
                                <span className="text-zinc-300 ml-2 mt-1">•</span>
                                <span className="text-zinc-500 mt-1 font-medium">
                                    {singleJob.job_location}
                                </span>
                                <span className="text-zinc-300 ml-2 mt-1">•</span>
                                <span className="text-zinc-500 mt-1 font-medium">
                                    Published on{" "}
                                    {new Date(singleJob.job_created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="px-4 !py-2 border rounded-lg text-[10px] uppercase tracking-widest font-bold text-white transition-all flex items-center gap-2">
                                    Add Applicant
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <CreateApplicationModal
                                    job={singleJob as JobListingType}
                                    candidates={candidates as CandidatesResponseType[]}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <JobTabs
                    jobs={jobs as JobResponseType[]}
                    stages={stages as StageResponseType[]}
                    jobListingId={jobListingId}
                    applications={applications as ApplicationType[]}
                    singleJob={singleJob as JobListingType}
                />
            </div>
        </KanbanProvider>
    );
};

export default Page;
