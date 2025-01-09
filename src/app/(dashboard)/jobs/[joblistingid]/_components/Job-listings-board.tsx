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
        <div className="flex h-full gap-4 overflow-y-hidden overflow-x-scroll">
            {stages?.map((stage) => (
                <Column
                    key={stage.stage_order_id}
                    title={stage.stage_name as string}
                    column={stage.stage_name}
                    stage={stage.stage_order_id + 1}
                    cards={jobs!}
                    setCards={setJobs}
                />
            ))}
        </div>
    );
};

export default JobListingsBoard;