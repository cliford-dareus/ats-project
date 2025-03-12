import React from 'react';
import {get_all_candidates_action} from "@/server/actions/candidates-actions";
import {CandidatesResponseType} from "@/types";
import CandidatesList from "@/app/(dashboard)/candidates/_components/candidates-list";
import {LucideSortAsc} from "lucide-react";
import ExtractFileButton from "@/components/extract-file-button";
import UploadCandidateResume from "@/components/modal/upload-candidate-resume";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {page, per_page} = await searchParams ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;

    const result= await get_all_candidates_action({limit, offset});
    const len = Array.isArray(result) ? result[0] : 0;
    const candidates = Array.isArray(result) ? result[1] : [];
    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="p-4">
            <div className="flex items-center justify-between p-4 rounded mb-2 border bg-muted">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">ALL CANDIDATES</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">{len as number}</span>
                </div>

                <div className="flex items-center gap-4">
                    <LucideSortAsc size={18}/>
                    <ExtractFileButton status="candidates"/>
                    <UploadCandidateResume />
                </div>
            </div>

            <CandidatesList application={candidates as CandidatesResponseType[]} pageCount={pageCount}/>
        </div>
    );
};

export default Page;
