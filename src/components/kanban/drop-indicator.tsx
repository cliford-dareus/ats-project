import React from 'react';

type Props = {
    stage: number
    beforeId: number | null;
    column: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null
}

const DropIndicator = ({stage, beforeId, column }: Props) => {
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