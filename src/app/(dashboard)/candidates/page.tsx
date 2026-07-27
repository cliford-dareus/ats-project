import React from "react";
import { get_all_candidates_action } from "@/server/actions/candidates-actions";
import { CandidatesResponseType } from "@/types";
import CandidatesList from "@/app/(dashboard)/candidates/_components/candidates-list";
import { LucideSortAsc } from "lucide-react";
import ExtractFileButton from "@/components/extract-table-button";
import UploadCandidateResume from "@/components/modal/upload-candidate-resume";
import { CANDIDATE_STATUS } from "@/zod";
import { auth } from "@clerk/nextjs/server";
import ListPageTop from "@/components/list-page-top";

type Props = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

const Page = async ({ searchParams }: Props) => {
    const { orgId } = await auth();
    const { page, per_page, status, experience, location, keyword } =
        (await searchParams) ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const keywords = keyword ? (keyword as string).split(",") : undefined;
    const statuses = status
        ? ((status as string).split(",") as (typeof CANDIDATE_STATUS._type)[])
        : undefined;
    const experiences = experience
        ? (experience as string).split(",")
        : undefined;
    const locations = location ? (location as string).split(",") : undefined;

    const result = await get_all_candidates_action({
        limit,
        offset,
        keywords,
        status: statuses,
        experience: experiences,
        location: locations,
        organization: orgId as string,
    });

    const len = Array.isArray(result) ? result[0] : 0;
    const candidates = Array.isArray(result) ? result[1] : [];

    const error =
        result && typeof result === "object" && "error" in result
            ? result.error
            : null;
    if (error) {
        console.error("Error fetching candidates:", error);
        return <div>Error loading Candidates.</div>;
    }

    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="p-4">
            <ListPageTop
                name="Candidates"
                count={len as number} file="candidates"
                data={candidates as CandidatesResponseType[]}
            />
            
            <CandidatesList
                candidate={candidates as CandidatesResponseType[]}
                pageCount={pageCount}
            />
        </div>
    );
};

export default Page;
