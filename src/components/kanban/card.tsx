'use client'

import { ApplicationType, StageResponseType } from "@/types";
import React, { useState } from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import { motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn, getTimeElapsed } from "@/lib/utils";
import { Calendar, Clock, ExternalLink, GripVertical } from "lucide-react";
import { useKanbanContext } from "@/providers/kanban-provider";
import ScheduleInterviewModal from "@/components/modal/schedule-interview-modal";
import { useHasPermission } from "@/lib/use-permission";

type Props = {
    data: ApplicationType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: StageResponseType;
    jobDetails: { jobName: string, department: string }
};

const Card = ({ data, handleDragStart, stage, jobDetails }: Props) => {
    const { pendingApplicationIds } = useKanbanContext();
    const hasPermission = useHasPermission();
    const canMove = hasPermission("application:move");
    const canSchedule = hasPermission("interview:schedule");
    const [isOpen, setIsOpen] = useState(false);

    const hasPendingAutomation = pendingApplicationIds.has(data.id);

    const hasScheduledInterview = data.interviews?.start_at != null &&
        new Date(data.interviews.start_at) > new Date();;

    return (
        <>
            <DropIndicator active={false} beforeId={data.id} stage={stage} column={data.stage} />

            <motion.div
                layout
                layoutId={String(data.id)}
                draggable={canMove}
                onDragStart={(e: never) => handleDragStart(e, data.id!)}
                className="group cursor-grab active:cursor-grabbing bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm hover:shadow-md"
            >
                <div className="flex gap-4 items-center">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                        </div>
                        {hasPendingAutomation && (
                            <div className="absolute -top-2 -left-2 bg-white text-blue-500 p-1 rounded-full shadow-md border border-slate-100 animate-bounce">
                                <Clock size={14} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{data?.candidate.name}</p>
                            <GripVertical size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <Link
                                href={`${stage.stage_name === "Applied" ? `/applications/${data.id}/review/${data.candidate.id}` : `/applications/${data.candidate.id}`}`}
                                className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors"
                            >
                                {stage.stage_name === "Applied" ? "Review Application" : "View Profile"}
                                <ExternalLink size={10} />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-2 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${stage.stage_name === 'Applied' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {stage.stage_name}
                        </span>
                        {stage.need_schedule && !hasScheduledInterview && canSchedule && (
                            <button
                                onClick={() => setIsOpen(true)}
                                className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-bold hover:bg-amber-100 transition-colors">
                                <Calendar size={10} />
                                NEED SCHEDULING
                            </button>
                        )}

                        {hasScheduledInterview && (
                            <button
                                className={cn("flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-bold hover:bg-amber-100 transition-colors",
                                    data.interviews?.status === "AWAITING_FEEDBACK" && "bg-yellow-50 text-yellow-700",
                                    data.interviews?.status === "COMPLETE" && "bg-green-50 text-green-700"
                                )}>
                                <Calendar size={10} />
                                {data.interviews?.status}
                            </button>
                        )}
                    </div>

                    <p className="text-[10px] font-medium text-slate-400">
                        {getTimeElapsed(data.updated_at)}d ago
                    </p>
                </div>
            </motion.div>

            <ScheduleInterviewModal isOpen={isOpen} setIsOpen={setIsOpen} application={data} jobDetails={jobDetails} />
        </>
    );
};

export default Card;
