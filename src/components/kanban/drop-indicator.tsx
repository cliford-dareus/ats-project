import React from 'react';

type Props = {
    beforeId: number | null;
    column: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null
}

const DropIndicator = ({ beforeId, column }: Props) => {
    return (
        <div
            data-before={beforeId || "-1"}
            data-column={column}
            className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
        />
    );
};

export default DropIndicator;