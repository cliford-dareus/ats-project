'use client'

import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import React from "react";
import DropIndicator from "@/components/kanban/drop-indicator";

type Props ={
    data: JobListingWithCandidatesType;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>,i: number ) => void;
    id: number
}

const Card = ({data , handleDragStart, id }: Props) => {
    return (
        <div>
            <DropIndicator beforeId={id} column={data.stageName?.toLocaleLowerCase()} />
            <div
                // layout
                // layoutId={id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, id)}
                className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 active:cursor-grabbing"
            >
                <p className="text-sm text-neutral-100">{data?.candidate_id}</p>
            </div>
        </div>
    );
};

export default Card;