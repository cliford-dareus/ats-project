import React from 'react';
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import CreateJobListingModal from "@/components/modal/create-job-listing-modal";
import {get_all_applications} from "@/server/db/application";
import CandidateList from "@/app/(dashboard)/candidates/_components/candidateList";
import {ApplicationResponseType} from "@/types/job-listings-types";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {page, per_page} = await searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    // const locations = location ? (location as string).split(',') : undefined;

    const [len, application] = await get_all_applications({limit, offset})

    // const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="p-4">
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

            <CandidateList application={application as unknown as ApplicationResponseType[]} />
        </div>
    )
};

export default Page;