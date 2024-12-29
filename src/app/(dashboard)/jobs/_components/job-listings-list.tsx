import PaginationElement from "@/components/pagination";
import type {JobResponseType} from "@/types/job-listings-types";
import DataTable from "@/app/(dashboard)/jobs/_components/data-table";
import {columns} from "@/app/(dashboard)/jobs/_components/column";

type Props = {
    jobs: JobResponseType[];
    pageCount: number;
}

const JobListingsList = ({jobs, pageCount}: Props) => {
    return(
        <>
            <DataTable columns={columns} data={jobs} />
            <PaginationElement pageCount={pageCount} />
        </>
    )
};

export default JobListingsList;