import React from 'react';import JobListingsBoard from "@/app/(dashboard)/jobs/[joblistingid]/_components/Job-listings-board";
import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import {get_job_listings_stages} from "@/server/db/job-listings";

type Props = {
    data: JobListingWithCandidatesType[];
};

const JobPipeline = async ({ data }: Props) => {
    const stages = await get_job_listings_stages(data[0]?.job_id);

    return (
        <div className="h-[calc(100vh-200px)]">
            <JobListingsBoard data={data} stages={stages}/>
        </div>
    );
};

export default JobPipeline;