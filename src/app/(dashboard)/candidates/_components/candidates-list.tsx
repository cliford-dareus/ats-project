"use client"

import React, {useState} from 'react';
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/candidates/_components/column";
import PaginationElement from "@/components/pagination";
import {CandidatesResponseType, } from "@/types";
import {Sheet, SheetContent} from "@/components/ui/sheet";
import CandidatePreview from "@/app/(dashboard)/candidates/_components/candidate-preview";

type Props = {
    application: CandidatesResponseType[],
    pageCount: number
}

const CandidatesList = ({application, pageCount}: Props) => {
    const [selectedRow, setSelectedRow] = useState<CandidatesResponseType | null>(null);

    return (
        <div>
            <DataTable<CandidatesResponseType>
                columns={columns} data={application}
                status="candidates"
                onRowClick={(rowData) => setSelectedRow(rowData)}
            />
            <PaginationElement pageCount={pageCount}/>
            <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
                <SheetContent side="right" className="sm:max-w-xl p-0">
                    {selectedRow && <CandidatePreview
                        data={selectedRow as CandidatesResponseType}
                        candidates={application as CandidatesResponseType[]}/>

                    }
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default CandidatesList;