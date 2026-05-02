import React from 'react';
import {ApplicationResponseType} from "@/types/job-listings-types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/applications/_components/column";
import PaginationElement from "@/components/pagination";

type Props = {
    application: ApplicationResponseType[];
    pageCount: number;
}

const CandidateList = ({application, pageCount}: Props) => {
    return (
        <div>
            <DataTable<ApplicationResponseType> columns={columns} data={application} status='application'/>
            <PaginationElement pageCount={pageCount}/>
        </div>
    );
};

export default CandidateList;