import React from "react";
import ApplicationList from "@/app/(dashboard)/applications/_components/application-list";
import { ApplicationResponseType } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { get_all_applications_action } from "@/server/actions/application_actions";
import ListPageTop from "@/components/list-page-top";
import { JOB_STAGES } from "@/zod";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    };
};

const Page = async ({ searchParams }: Props) => {
    const { orgId } = await auth();
    const { page, per_page, location, status, department, search, keyword, sort } = (await searchParams) ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    // `status` is a comma-separated list of stage names (JOB_STAGES), not
    // job statuses — typed honestly instead of cast to JOB_STATUS.
    const statuses = status ? (status as string).split(",") as (typeof JOB_STAGES._type)[] : undefined;
    const locations = location ? (location as string).split(",") : undefined;
    const departments = department ? (department as string).split(",") : undefined;
    // B10: the sidebar search input writes ?search=… — read it as the
    // keyword filter (same pattern as the candidates page). The query
    // already supported keywords; the page just never passed them.
    const searchTerm = typeof search === "string" ? search : typeof keyword === "string" ? keyword : undefined;
    const keywords = searchTerm ? searchTerm.split(",") : undefined;

    const result = await get_all_applications_action({
        limit,
        offset,
        stages: statuses,
        location: locations,
        department: departments,
        keywords,
        // B9: sort rides in filterApplicationsSchema and is validated
        // against the allowlist in the query.
        sort: typeof sort === "string" ? sort : undefined,
        organization: orgId!,
    });

    const len = Array.isArray(result) ? result[0] : 0;
    const application = Array.isArray(result) ? result[1] : [];
    const error =
        result && typeof result === "object" && "error" in result
            ? result.error
            : null;
    if (error) {
        console.error("Error fetching application:", error);
        return <div>Error loading Application.</div>;
    }

    const pageCount = Math.ceil((len as number) / limit);

    return (
        <div className="p-4">
            <ListPageTop
                name="Applications"
                count={len as number}
                file="application" data={application as unknown as ApplicationResponseType[]}
            />

            <ApplicationList
                application={application as unknown as ApplicationResponseType[]}
                pageCount={pageCount}
            />
        </div>
    );
};

export default Page;
