import React from 'react';
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/candidates/_components/column";
import PaginationElement from "@/components/pagination";
import {CandidatesResponseType} from "@/types";

type Props = {
    application: CandidatesResponseType[],
    pageCount: number
}

const CandidatesList = ({application, pageCount}: Props) => {
    return (
        <div>
            <DataTable<CandidatesResponseType> columns={columns} data={application} status="candidates"/>
            <PaginationElement pageCount={pageCount}/>
        </div>
    );
};

export default CandidatesList;