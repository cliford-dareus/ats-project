'use client'

import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";

type Props = {
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, i: number) => void;
    stage: number;
}

const Card = ({data, handleDragStart, stage}: Props) => {
    return (
        <div>
            <DropIndicator beforeId={data.candidate_id} stage={stage} column={data.stageName}/>
            <div
                // layout
                // layoutId={String(data?.candidate_id)}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, data.candidate_id)}
                className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 active:cursor-grabbing"
            >
                <p className="text-sm text-neutral-100">{data?.candidate_id}</p>
            </div>
        </div>
    );
};

export default Card;