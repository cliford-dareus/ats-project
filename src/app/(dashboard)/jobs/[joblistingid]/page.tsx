import React from 'react';
import {get_job_listing_with_candidate} from "@/server/db/job-listings";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {CustomTabsTrigger, Tabs, TabsList} from "@/components/ui/tabs";
import Link from "next/link";
import {BriefcaseBusiness, CircleUser} from "lucide-react";

type Props = {
    params: {
        joblistingid: string;
    }
}

const Page = async ({params}: Props) => {
    const { joblistingid } = await params;
    const d = await get_job_listing_with_candidate(Number(joblistingid));

    if(d.length==0){
        // Create a Page for no Candidate
        return
    }

    return (
        <div className="">
            <div className="flex items-center justify-between w-full p-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-xl">{d[0]?.name}</h1>
                        <Badge className="bg-green-100 text-green-500 font-normal shadow-none">Actively hiring</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">Published
                            on {d[0]?.created_at.toString().split(' ').slice(0, 3).join(' ')}</p>
                    </div>
                </div>

                <Button>Add Applicant</Button>
            </div>

            <div className="flex px-4 border-b">
                <Tabs className="px-0 h-full" defaultValue="details">
                    <TabsList className="bg-transparent rounded-none p-0">
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="details">
                            <BriefcaseBusiness size={20}/>
                            <Link href={`/jobs/${d[0]?.job_id}/`}>Details</Link>
                        </CustomTabsTrigger>
                        <CustomTabsTrigger className="px-4 flex items-center gap-4" value="candidates">
                            <CircleUser size={20}/>
                            <Link href={`/jobs/${d[0]?.job_id}/candidates`}>Applicants</Link>
                        </CustomTabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </div>
    );
};

export default Page;