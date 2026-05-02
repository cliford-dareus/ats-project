import React from 'react';
import {JOB_ENUM} from "@/zod";
import {cn} from "@/lib/utils";
import {StageResponseType} from "@/types";

type Props = {
    stage: StageResponseType
    beforeId: number | null;
    column: JOB_ENUM | null | undefined;
    active: boolean;
};

const DropIndicator = ({stage, beforeId, column, active}: Props) => {
    return (
        <div
            data-stage={stage.id}
            data-scheduling={stage.need_schedule}
            data-before={beforeId || -1}
            data-column={column}
            className={cn(active? 'h-[102px]':'h-.5',"my-0.5 w-full bg-blue-200 opacity-0 border rounded")}
        />
    );
};

export default DropIndicator;
