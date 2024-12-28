import React from 'react';
import {get_job_listing_with_candidate} from "@/server/db/job-listings";
import Board from "@/components/kanban/board";

type Props = {
    params: {
        joblistingid: string;
    }
}

const Page = async ({params}: Props) => {
    const {joblistingid} = await params;
    const data = await get_job_listing_with_candidate(Number(joblistingid))

    return (
        <div className="p-4">
            <Board data={data} />
        </div>
    );
};

export default Page;