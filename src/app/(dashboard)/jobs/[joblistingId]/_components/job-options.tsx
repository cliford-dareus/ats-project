'use client'

import React, {useState} from 'react';
import {JobListingWithCandidatesType, StageResponseType} from "@/types/job-listings-types";
import {JOB_ENUM} from "@/schema";
import {cn} from "@/lib/utils";
import {X} from "lucide-react";

type Props = {
    data: JobListingWithCandidatesType[];
    stages: StageResponseType[]
};

const JobOptions = ({data, stages}: Props) => {
    const [openStage, setOpenStage] = useState<JOB_ENUM>();
    return (
        <div className="p-4 overflow-hidden h-[calc(100vh-200px)] flex gap-4">
            <div className="flex-1">
                {stages?.map((stage) => (
                    <>
                        <div
                            className="relative flex bg-muted justify-between items-center w-full p-2 min-h-8 rounded border"
                            onClick={() => {
                                setOpenStage(stage.stage_name as JOB_ENUM)
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <span className={cn(stage.color, "w-4 h-4 rounded")}></span>
                                <p className="w-[150px]">{stage.stage_name}</p>
                            </div>
                            <div
                                className="flex items-center justify-between w-[30px] absolute right-0 top-0 bottom-0"
                                // onClick={() => removeJob(item, "jobStages")}
                            >
                                <X className="cursor-pointer" size={20}/>
                            </div>

                        </div>

                        {openStage === stage.stage_name &&
                            <div className="w-full border p-4 flex flex-col gap-4 h-10">

                            </div>
                        }
                    </>
                ))}
            </div>
            <div className="w-[40%] h-full border rounded"></div>
        </div>
    );
};

export default JobOptions;