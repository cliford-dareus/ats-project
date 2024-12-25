'use client'

import {useOrganization, useUser} from '@clerk/nextjs';
import {DataTable} from "@/app/(dashboard)/settings/_components/data-table";
import {columns, OrganizationMember} from "@/app/(dashboard)/settings/_components/colunm";

const OrgMembersParams = {
    memberships: {
        pageSize: 2,
        keepPreviousData: true,
    },
}

const Page = () => {
    // const {user} = useUser()
    const {isLoaded, memberships} = useOrganization(OrgMembersParams)


    if (!isLoaded) {
        return <>Loading</>
    }

    return (
        <div className="">
            <div className="">
              <DataTable columns={columns} data={memberships?.data as unknown as OrganizationMember[]}/>
            </div>
        </div>
    )
};

export default Page;