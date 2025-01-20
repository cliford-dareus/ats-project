'use client'

import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import {motion} from "motion/react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import Link from "next/link";

type Props = {
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: number;
};

const Card = ({data, handleDragStart, stage}: Props) => {
    return (
        <div>
            <DropIndicator active={false} beforeId={data.application_id} stage={stage} column={data.stageName}/>
            <motion.div
                layout
                layoutId={String(data?.application_id)}
                draggable="true"
                onDragStart={(e: never) => handleDragStart(e, data.application_id!)}
                className="cursor-grab rounded bg-white border shadow p-2 active:cursor-grabbing z-50"
            >
                <div className="flex gap-4 items-center">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="">
                        <p className="text-base font-bold leading-4">{data?.candidate_name}</p>
                        {
                            stage === 1 ?
                                (<Link
                                    className="text-xs text-blue-500 leading-4"
                                    href={`/jobs/${data.job_id}/${data.candidate_id}`}>Review Application</Link>)
                                :
                                (<Link
                                    className="text-xs text-blue-500 leading-4"
                                    href={`/candidates/${data.candidate_id}`}
                                >
                                    View Profile
                                </Link>)
                        }
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{data.application_id} days ago</p>
            </motion.div>
        </div>
    );
};

export default Card;