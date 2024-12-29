import React from 'react';
import {get_job_listing_with_candidate, get_job_listings_stages} from "@/server/db/job-listings";
import JobListingsBoard from "@/app/(dashboard)/jobs/_components/Job-listings-board";

type Props = {
    params: {
        joblistingid: string;
    }
}

const Page = async ({params}: Props) => {
    const {joblistingid} = await params;

    // Call those in actions
    const data = await get_job_listing_with_candidate(Number(joblistingid));
    const stages = await get_job_listings_stages(data[0]?.job_id);

    return (
        <div className="p-4 w-full overflow-hidden">
            <JobListingsBoard data={data} stages={stages}/>
        </div>
    );
};

export default Page;