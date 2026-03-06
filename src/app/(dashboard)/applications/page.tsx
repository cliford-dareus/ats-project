import React from "react";
import ApplicationList from "@/app/(dashboard)/applications/_components/application-list";
import { ApplicationResponseType } from "@/types";
import { auth } from "@clerk/nextjs/server";
import ExtractFileButton from "@/components/extract-file-button";
import { Plus } from "lucide-react";
import { get_applications_with_filter_action } from "@/server/actions/application_actions";
import ListPageTop from "@/components/list-page-top";

type Props = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const Page = async ({ searchParams }: Props) => {
  const { orgId } = await auth();
  const { page, per_page } = (await searchParams) ?? {};

  const limit = typeof per_page === "string" ? parseInt(per_page) : 8;
  const offset = typeof page === "string" ? (parseInt(page) - 1) * limit : 0;
  // const locations = location ? (location as string).split(',') : undefined;

  const result = await get_applications_with_filter_action({
    limit,
    offset,
    organization: orgId!,
  });
  const len = Array.isArray(result) ? result[0] : 0;
  const application = Array.isArray(result) ? result[1] : [];
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
