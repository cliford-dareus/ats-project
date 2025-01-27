import React from 'react';
import {get_all_applications} from "@/server/db/application";
import CandidateList from "@/app/(dashboard)/candidates/_components/candidate-list";
import {ApplicationResponseType} from "@/types/job-listings-types";
import {auth} from "@clerk/nextjs/server";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {orgId} = await auth();
    const {page, per_page} = await searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    // const locations = location ? (location as string).split(',') : undefined;

    const [len, application] = await get_all_applications({limit, offset, organization: orgId!})
    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="p-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded mb-2">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">APPLICATIONS</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">{len as number}</span>
                </div>
            </div>

            <CandidateList application={application as unknown as ApplicationResponseType[]} pageCount={pageCount}/>
        </div>
    )
};

export default Page;