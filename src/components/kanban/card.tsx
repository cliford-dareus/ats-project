'use client'

import {JobListingWithCandidatesType, StageResponseType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import {motion} from "motion/react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {getTimeElapsed} from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import CreateApplicationSchedule from "@/components/modal/create-application-schedule";

type Props = {
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: StageResponseType;
};

const Card = ({data, handleDragStart, stage}: Props) => {  
    return (
        <div>
            <DropIndicator active={false} beforeId={data.application_id} stage={stage} column={data.stageName}/>
            <motion.div
                layout
                layoutId={String(data.application_id)}
                draggable="true"
                onDragStart={(e: never) => handleDragStart(e, data.application_id!)}
                className="cursor-grab rounded bg-white border  p-4 active:cursor-grabbing z-[999999] relative"
            >
                <div className="flex gap-4 items-center">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="">
                        <p className="text-base font-semibold leading-3">{data?.candidate_name}</p>
                        {
                            stage.stage_name === "Applied" ?
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
                <div className="mt-2 flex justify-between">
                    {stage.need_schedule && 
                      <Dialog>
                        <DialogTrigger>
                          <Badge className="mt-2">Need scheduling</Badge>
                        </DialogTrigger>
                        <DialogContent>
                          <CreateApplicationSchedule />
                        </DialogContent>
                      </Dialog>
                    }
                    <p className="text-xs text-slate-400 mt-2">{getTimeElapsed(data.application_updated_at)} days ago</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Card;