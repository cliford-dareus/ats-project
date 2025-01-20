import PaginationElement from "@/components/pagination";
import type {JobResponseType} from "@/types/job-listings-types";
import DataTable from "@/components/data-table";
import {columns} from "@/app/(dashboard)/jobs/[joblistingId]/_components/column";

type Props = {
    jobs: JobResponseType[];
    pageCount: number;
}

const JobListingsList = ({jobs, pageCount}: Props) => {
    return (
        <>
            <DataTable<JobResponseType> columns={columns} data={jobs} status="jobs" />
            <PaginationElement pageCount={pageCount}/>
        </>
    )
};

export default JobListingsList;