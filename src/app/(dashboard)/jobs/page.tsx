import JobListingsList from "@/app/(dashboard)/jobs/_components/job-listings-list";
import {JobResponseType} from "@/types";
import {auth} from "@clerk/nextjs/server";
import {get_all_job_listings_action} from "@/server/actions/job-listings-actions";
import ListPageTop from "@/components/list-page-top";
import React from "react";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    };
};

const Page = async ({searchParams}: Props) => {
    const {orgId} = await auth();
    const {location, salary, department, page, per_page} =
    (await searchParams) ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const locations = location ? (location as string).split(",") : undefined;
    const departments = department
        ? (department as string).split(",")
        : undefined;
    const salaries = salary ? (salary as string).split(",") : undefined;

    const result = await get_all_job_listings_action({
        offset,
        limit,
        location: locations,
        salary: salaries,
        department: departments,
        organization: orgId as string,
    });

    const len = Array.isArray(result) ? result[0] : 0;
    const jobs = Array.isArray(result) ? result[1] : [];
    const error =
        result && typeof result === "object" && "error" in result
            ? result.error
            : null;

    if (error) {
        console.error("Error fetching job listings:", error);
        return <div>Error loading jobs.</div>;
    }

    const pageCount = len && limit ? Math.ceil((len as number) / limit) : 0;

    return (
        <div className="md:p-4">
            <ListPageTop name="JOBS OPENINGS" count={len as number} file="jobs"/>
            <JobListingsList jobs={jobs as JobResponseType[]} pageCount={pageCount}/>
        </div>
    );
};

export default Page;
