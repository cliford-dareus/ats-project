"use client"

import {ColumnDef} from "@tanstack/react-table"
import {Organization, OrganizationMembership} from "@clerk/backend";
import {OrganizationCustomRoleKey, PublicUserData, UpdateOrganizationMembershipParams} from "@clerk/types";
import {Button} from "@/components/ui/button";

import {SelectRole} from "@/app/(dashboard)/settings/_components/selectRole";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type OrganizationMember = {
    id: string
    publicMetadata: { [key: string]: unknown }
    role: string
    publicUserData: PublicUserData
    organization: Organization
    createdAt: string
    updatedAt: string

    update: (updateParams: UpdateOrganizationMembershipParams) => Promise<OrganizationMembership>
    destroy: () => Promise<OrganizationMembership>
}

export const columns: ColumnDef<OrganizationMember>[] = [
    {
        accessorKey: "publicUserData.identifier",
        header: "user"
    },
    {
        accessorKey: "role",
        header: "Role",
    },
    {
        id: "select",
        header: "Update Role",
        cell: ({row}) => {
            const org = row.original
            return (
                <SelectRole
                    defaultRole={org.role}
                    onChange={async (e) => {
                        await org.update({
                            role: e.target.value as OrganizationCustomRoleKey,
                        })
                    }}
                />
            )
        },
    },
    {
        id: "revoke",
        header: "Revoke",
        cell: ({row}) => {
            const org = row.original
            return (
                <Button onClick={async () => {
                    await org.destroy()
                }}>Delete</Button>
            )
        }
    }
]
