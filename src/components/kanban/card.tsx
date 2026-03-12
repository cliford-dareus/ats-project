'use client'

import {ApplicationType, StageResponseType} from "@/types";
import React, {useEffect, useState} from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import {motion} from "motion/react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import Link from "next/link";
import {getTimeElapsed} from "@/lib/utils";
import {Clock} from "lucide-react";
import {TriggerTask} from "@/lib/smart-trigger/types";
import {useKanbanContext} from "@/providers/kanban-provider";
import ScheduleInterviewModal from "@/components/modal/schedule-interview-modal";


type Props = {
    data: ApplicationType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: StageResponseType;
    jobDetails: {jobName: string, department: string}
};

const Card = ({data, handleDragStart, stage, jobDetails}: Props) => {
    const {tasks} = useKanbanContext();
    const [activeTrigger, setActiveTrigger] = useState<TriggerTask[]>([]);
    const [isOpen, setIsOpen] =useState(false);

    useEffect(() => {
        const filteredTasks = tasks.filter(task => task.application_id === data.id);
        setActiveTrigger(filteredTasks);
    }, [tasks, data.id]);

    return (
        <>
            <DropIndicator active={false} beforeId={data.id} stage={stage} column={data.stage}/>
            <motion.div
                layout
                layoutId={String(data.id)}
                draggable="true"
                onDragStart={(e: never) => handleDragStart(e, data.id!)}
                className="cursor-grab rounded bg-white border p-4 active:cursor-grabbing"
            >
                <div className="flex gap-4 items-center">
                    <div className="relative">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src="https://github.com/shadcn.png"/>
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        {activeTrigger.length > 0 && activeTrigger.some(task => new Date(task.triggerTime).getTime() > Date.now()) &&
                            <div className="absolute -top-4 -left-2">
                                <Clock size={18}/>
                            </div>}
                    </div>

                    <div className="">
                        <p className="text-base font-semibold leading-3">{data?.candidate.name}</p>
                        {
                            stage.stage_name === "Applied" ?
                                (<Link
                                    className="text-xs text-blue-500 leading-4"
                                    href={`/applications/${data.id}/review/${data.candidate.id}`}>Review
                                    Application</Link>)
                                :
                                (<Link
                                    className="text-xs text-blue-500 leading-4"
                                    href={`/applications/${data.candidate.id}`}
                                >
                                    View Profile
                                </Link>)
                        }
                    </div>
                </div>

                <div className="mt-2 flex justify-between">
                    {stage.need_schedule && <div className="mt-2" onClick={() => setIsOpen(true)}>Need scheduling</div>}
                    <p className="text-xs text-slate-400 mt-2">{getTimeElapsed(data.updated_at)} days ago</p>
                </div>
            </motion.div>

            <ScheduleInterviewModal isOpen={isOpen} setIsOpen={setIsOpen} application={data} jobDetails={jobDetails}/>
        </>
    );
};

export default Card;
