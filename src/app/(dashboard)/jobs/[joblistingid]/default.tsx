import React from 'react';
import {get_job_listing_with_candidate} from "@/server/db/job-listings";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {CustomTabsTrigger, Tabs, TabsList} from "@/components/ui/tabs";
import Link from "next/link";
import {BriefcaseBusiness, CircleUser} from "lucide-react";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import CreateApplicationModal from "@/components/modal/create-application-modal";
import {get_all_job_listings_action} from "@/server/actions/job-listings-actions";
import {candidatesResponseType, JobResponseType} from "@/types/job-listings-types";
import {get_all_candidates_action} from "@/server/actions/candidates-actions";

type Props = {
    params: {
        joblistingid: string;
    }
}

const Default = async ({params}: Props) => {
    const {joblistingid} = await params;

    // @ts-expect-error
    const [, jobs]  = await get_all_job_listings_action({});
    const [job] = await get_job_listing_with_candidate(Number(joblistingid));
    const candidates = await get_all_candidates_action();


    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full p-4">
                <div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <h1 className="font-bold text-xl">{job?.name}</h1>
                            <Badge className="bg-green-100 text-green-500 font-normal shadow-none">Actively
                                hiring</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">Published
                                on {job?.created_at.toString().split(' ').slice(0, 3).join(' ')}</p>
                        </div>
                    </div>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Add Applicant</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <CreateApplicationModal job={jobs as JobResponseType[]} candidates={candidates as candidatesResponseType[]} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex px-4 border-b">
                <Tabs className="px-0 h-full" defaultValue="details" >
                    <TabsList className="bg-transparent rounded-none p-0">
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="details">
                            <BriefcaseBusiness size={20}/>
                            <Link href={`/jobs/${job?.job_id}/`}>Details</Link>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="candidates">
                            <CircleUser size={20}/>
                            <Link href={`/jobs/${job?.job_id}/candidates`}>Applicants</Link>
                        </CustomTabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
};

export default Default;