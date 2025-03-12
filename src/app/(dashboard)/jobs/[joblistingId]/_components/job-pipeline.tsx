'use client'

import React, {useEffect, useState} from 'react';
import {JobListingWithCandidatesType, StageResponseType} from "@/types";
import Column from "@/components/kanban/column";

type Props = {
    data: JobListingWithCandidatesType[];
    stages: StageResponseType[]
};

const JobPipeline = ({data, stages}: Props) => {
    const [jobs, setJobs] = useState<JobListingWithCandidatesType[]>();

    useEffect(() => {
        setJobs(data)
    }, [data]);

    return (
        <div className="h-[calc(100vh-200px)]">
            <div className="flex h-full gap-4 overflow-y-hidden overflow-x-scroll">
                {stages?.map((stage) => (
                    <Column
                        key={stage.stage_order_id}
                        title={stage.stage_name as string}
                        column={stage.stage_name!}
                        stage={stage}
                        cards={jobs!}
                        color={stage.color}
                        setCards={setJobs}
                    />
                ))}
            </div>
        </div>
    );
};

export default JobPipeline;