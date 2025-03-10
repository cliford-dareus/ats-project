'use client'

import React, {useEffect, useState} from 'react';
import {JobListingWithCandidatesType, StageResponseType} from "@/types";
import Column from "@/components/kanban/column";
import {getTasks} from "@/server/db/smart-task";

type Props = {
    data: JobListingWithCandidatesType[];
    stages: StageResponseType[]
};

const JobPipeline = ({data, stages}: Props) => {
    const [jobs, setJobs] = useState<JobListingWithCandidatesType[]>();
    const [tasks, setTasks] = useState([])

    useEffect(() => {
        setJobs(data)

        const gn = async () => {
            const response = await getTasks();
            const parseResult = JSON.parse(response)
            setTasks(parseResult.tasks)
        };

        gn();
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
                        tasks={tasks}
                    />
                ))}
            </div>
        </div>
    );
};

export default JobPipeline;