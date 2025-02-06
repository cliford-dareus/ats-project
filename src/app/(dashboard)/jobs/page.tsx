import JobListingsList from "@/app/(dashboard)/jobs/_components/job-listings-list";
import {JobResponseType} from "@/types/job-listings-types";
import {auth} from "@clerk/nextjs/server";
import {get_all_job_listings_action} from "@/server/actions/job-listings-actions";
import ExtractFileButton from "@/components/extract-file-button";
import {Plus} from "lucide-react";
import React from "react";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {orgId} = await auth();
    const {location, page, per_page} = await searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const locations = location ? (location as string).split(',') : undefined;
    // const departments = location ? (location as string).split(',') : undefined;

    const result = await get_all_job_listings_action({
        offset, limit, location: locations,
        organization: orgId as string,
    });

    let len: number | undefined;
    let jobs: JobResponseType[] | undefined;
    let error: boolean | undefined;

    if (Array.isArray(result)) {
        [len, jobs] = result as [number, JobResponseType[]];
    } else if (result && typeof result === "object" && 'error' in result) {
        error = result.error;
    }

    if (error) {
        console.error("Error fetching job listings:", error);
        return <div>Error loading jobs.</div>;
    }

    const pageCount = len && limit ? Math.ceil((len as number) / limit) : 0;

    return (
        <div className="md:p-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded mb-2">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">JOBS</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">{len as number}</span>
                </div>

                <div className="flex items-center gap-4">
                    <ExtractFileButton status="jobs"/>
                    <div className="p-1 bg-blue-300 rounded cursor-pointer hover:bg-blue-400">
                        <Plus size={18}/>
                    </div>
                </div>
            </div>
            <JobListingsList jobs={jobs as JobResponseType[]} pageCount={pageCount}/>
        </div>
    );
};

export default Page;