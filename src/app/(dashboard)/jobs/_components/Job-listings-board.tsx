'use client'

import React, {useEffect, useState} from 'react';
import Column from "@/components/kanban/column";
import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import {JOB_ENUM} from "@/schema";

type Props = {
    data: JobListingWithCandidatesType[];
    stages: {
        id: number
        job_id: number
        stage_name: JOB_ENUM
        stage_order_id: number
        assign_to: string | null
    }[]
};

const JobListingsBoard = ({data, stages}: Props) => {
    const [jobs, setJobs] = useState<JobListingWithCandidatesType[]>();

    useEffect(() => {
        setJobs(data)
    }, [data])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  h-full w-full gap-3">
            {stages?.map((stage) => (
                <Column
                    key={stage.stage_order_id}
                    title={stage.stage_name as string}
                    column={stage.stage_name}
                    stage={stage.stage_order_id + 1}
                    headingColor="text-emerald-200"
                    cards={jobs!}
                    setCards={setJobs}
                />
            ))}

        </div>
    );
};

export default JobListingsBoard;