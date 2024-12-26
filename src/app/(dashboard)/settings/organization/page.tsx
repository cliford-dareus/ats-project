'use client'

import {useOrganization, useUser} from '@clerk/nextjs';
import {DataTable} from "@/app/(dashboard)/settings/_components/data-table";
import {columns, OrganizationMember} from "@/app/(dashboard)/settings/_components/colunm";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import CreateOrganization from "@/app/(dashboard)/settings/_components/create-organization";

const OrgMembersParams = {
    memberships: {
        pageSize: 2,
        keepPreviousData: true,
    },
}

const Page = () => {
    const {user} = useUser()
    const {isLoaded, memberships} = useOrganization(OrgMembersParams)

    if (!isLoaded) {
        return <>Loading</>
    }

    return (
        <div className="p-4">
            {
                memberships?.data &&
                <div className="flex gap-4 items-center">
                    <h1 className="font-medium text-xl">{memberships?.data[0]?.organization.name.toUpperCase()}</h1>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Create New Organization</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create Organization</DialogTitle>
                                <DialogDescription>
                                    Make changes to your profile here. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <CreateOrganization />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            }

            <div className="mt-4">
                <DataTable columns={columns} data={memberships?.data as unknown as OrganizationMember[]}/>
            </div>
        </div>
    )
};

export default Page;