"use client"

import PaginationElement from "@/components/pagination";
import {JobResponseType} from "@/types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/jobs/[joblistingId]/_components/column";
import React, {useState} from "react";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import JobPreview from "@/app/(dashboard)/jobs/_components/job-preview";

type Props = {
    jobs: JobResponseType[];
    pageCount: number;
};

const JobListingsList = ({jobs, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] = useState<JobResponseType | null>(null);

    return (
        <>
            <DataTable<JobResponseType>
                columns={columns} data={jobs}
                status="jobs"
                onRowClick={(rowData) => setSelectedRow(rowData)}
            />
            <PaginationElement pageCount={pageCount}/>
            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetHeader>
                    <SheetTitle></SheetTitle>
                </SheetHeader>
                <SheetContent side="right" className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden">
                    {selectedRow && <JobPreview
                        data={selectedRow as JobResponseType}
                        jobs={jobs as JobResponseType[]}/>
                    }
                </SheetContent>
            </Sheet>
        </>
    )
};

export default JobListingsList;