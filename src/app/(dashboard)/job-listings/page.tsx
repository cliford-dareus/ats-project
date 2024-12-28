import React from 'react';
import {get_all_job_listings} from "@/server/db/job-listings";
import JobListingsList from "@/app/(dashboard)/job-listings/_components/job-listings-list";
import {JobResponseType} from "@/types/job-listings-types";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
}

const Page = async ({searchParams}: Props) => {
    const {location, page, per_page} = searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const locations = location ? (location as string).split(',') : undefined

    const [len, jobs] = await get_all_job_listings({
        offset, limit, location: locations
    });

    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="md:p-4">
            <JobListingsList jobs={jobs as JobResponseType[]} pageCount={pageCount}/>
        </div>
    );
};

export default Page;