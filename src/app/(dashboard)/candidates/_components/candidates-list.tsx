"use client"

import React, {useState} from 'react';
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/candidates/_components/column";
import PaginationElement from "@/components/pagination";
import {CandidatesResponseType, } from "@/types";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import CandidatePreview from "@/app/(dashboard)/candidates/_components/candidate-preview";

type Props = {
    candidate: CandidatesResponseType[],
    pageCount: number
}

const CandidatesList = ({candidate, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] = useState<CandidatesResponseType | null>(null);

    return (
        <>
            <div className="rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <DataTable<CandidatesResponseType>
                    columns={columns} data={candidate}
                    status="candidates"
                    onRowClick={(rowData) => setSelectedRow(rowData)}
                />
                <PaginationElement pageCount={pageCount}/>
            </div>

            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetHeader>
                    <SheetTitle></SheetTitle>
                </SheetHeader>
                <SheetContent side="right" className="sm:max-w-xl p-0 [&>button:first-of-type]:hidden">
                    {selectedRow && <CandidatePreview
                        data={selectedRow as CandidatesResponseType}
                        candidates={candidate as CandidatesResponseType[]}/>
                    }
                </SheetContent>
            </Sheet>
        </>
    );
};

export default CandidatesList;
