import React from 'react';
import {get_all_job_listings} from "@/server/db/job-listings";
import JobListingsList from "@/app/(dashboard)/jobs/_components/job-listings-list";
import {JobResponseType} from "@/types/job-listings-types";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import CreateJobListingModal from "@/app/(dashboard)/jobs/_components/create-job-listing-modal";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {location, page, per_page} = await searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const locations = location ? (location as string).split(',') : undefined;

    const [len, jobs] = await get_all_job_listings({
        offset, limit, location: locations
    });

    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="md:p-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded mb-2">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">JOBS</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">{len as number}</span>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Add Job</Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-none">
                        <CreateJobListingModal/>
                    </DialogContent>
                </Dialog>
            </div>
            <JobListingsList jobs={jobs as JobResponseType[]} pageCount={pageCount}/>
        </div>
    );
};

export default Page;