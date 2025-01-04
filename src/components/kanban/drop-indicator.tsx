import React from 'react';
import {JOB_ENUM} from "@/schema";

type Props = {
    stage: number
    beforeId: number | null;
    column: JOB_ENUM
}

const DropIndicator = ({stage, beforeId, column}: Props) => {
    // console.log(column, stage)
    return (
        <div
            data-stage={stage}
            data-before={beforeId || -1}
            data-column={column}
            className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
        />
    );
};

export default DropIndicator;