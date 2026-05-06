import React from "react";
import ApplicationList from "@/app/(dashboard)/applications/_components/application-list";
import { ApplicationResponseType } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { get_all_applications_action } from "@/server/actions/application_actions";
import ListPageTop from "@/components/list-page-top";
import { JOB_STATUS } from "@/zod";

type Props = {
    searchParams: {
        [key: string]: string | string[] | undefined;
    };
};

const Page = async ({ searchParams }: Props) => {
    const { orgId } = await auth();
    const { page, per_page, location, status, department } = (await searchParams) ?? {};

    const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
    const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
    const statuses = status ? (status as string).split(",") as (typeof JOB_STATUS._type)[] : undefined;
    const locations = location ? (location as string).split(",") : undefined;
    const departments = department ? (department as string).split(",") : undefined;

    const result = await get_all_applications_action({
        limit,
        offset,
        stages: statuses,
        location: locations,
        department: departments,
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
            <ListPageTop name="Applications" count={len as number} file="application" />

            <ApplicationList
                application={application as unknown as ApplicationResponseType[]}
                pageCount={pageCount}
            />
        </div>
    );
};

export default Page;
