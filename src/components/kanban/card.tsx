'use client'

import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";
import {motion} from "motion/react";

type Props = {
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: number;
}

const Card = ({data, handleDragStart, stage}: Props) => {
    return (
        <div>
            <DropIndicator beforeId={data.application_id} stage={stage} column={data.stageName}/>
            <motion.div
                layout
                layoutId={String(data?.application_id)}
                draggable="true"
                onDragStart={(e: any) => handleDragStart(e, data.application_id!)}
                className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 active:cursor-grabbing"
            >
                <p className="text-sm text-neutral-100">{data?.application_id}</p>
            </motion.div>
        </div>
    );
};

export default Card;