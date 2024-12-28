'use client'

import React, {useState} from 'react';
import Column from "@/components/kanban/column";
import {JobListingWithCandidatesType} from "@/types/job-listings-types";

type Props = {
    data: JobListingWithCandidatesType[]
}

const Board = ({data}: Props) => {
    const [jobs, setJobs]= useState<JobListingWithCandidatesType[]>(data);

    return (
        <div className="flex h-full w-full gap-3 overflow-scroll p-12">
            <Column
                title="Screening"
                column="screening"
                headingColor="text-neutral-500"
                cards={jobs}
                setCards={setJobs}
            />
            <Column
                title="Phone Interview"
                column="phone interview"
                headingColor="text-yellow-200"
                cards={data}
                setCards={setJobs}
            />
            <Column
                title="Hired"
                column="hired"
                headingColor="text-blue-200"
                cards={data}
                setCards={setJobs}
            />
            {/*<Column*/}
            {/*    title="Complete"*/}
            {/*    column="done"*/}
            {/*    headingColor="text-emerald-200"*/}
            {/*    cards={cards}*/}
            {/*    setCards={setCards}*/}
            {/*/>*/}
        </div>
    );
};

export default Board;