"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Organization, OrganizationMembership } from "@clerk/backend";
import { OrganizationCustomRoleKey, PublicUserData, UpdateOrganizationMembershipParams } from "@clerk/types";
import { Button } from "@/components/ui/button";
import { SelectRole } from "@/app/(dashboard)/settings/_components/selectRole";

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

export type MemberColumnsOptions = {
    /** Current viewer is an org admin and may manage members. */
    canManage: boolean
    /** Clerk user id of the current viewer — their own row can't be removed. */
    selfUserId?: string | null
    /** Called with a human-readable message when a role change / removal fails. */
    onError?: (message: string) => void
}

/**
 * Builds the members table columns for the current viewer. The Update Role
 * select and the Remove button are admin-only (org:admin) — non-admins get
 * a read-only table — and the current user's own row never gets a Remove
 * button, so self-removal can't happen by accident. Failures are reported
 * through onError instead of alert().
 */
export function buildMemberColumns({ canManage, selfUserId, onError }: MemberColumnsOptions): ColumnDef<OrganizationMember>[] {
    return [
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
            cell: ({ row }) => {
                if (!canManage) return null
                const org = row.original
                return (
                    <SelectRole
                        defaultRole={org.role}
                        onChange={async (e) => {
                            try {
                                await org.update({
                                    role: e.target.value as OrganizationCustomRoleKey,
                                })
                            } catch {
                                onError?.(`Could not update the role for ${org.publicUserData.identifier}.`)
                            }
                        }}
                    />
                )
            },
        },
        {
            id: "revoke",
            header: "Revoke",
            cell: ({ row }) => {
                if (!canManage) return null
                const org = row.original
                // No accidental self-removal.
                if (selfUserId != null && org.publicUserData.userId === selfUserId) return null
                return (
                    <Button
                        onClick={async () => {
                            try {
                                await org.destroy()
                            } catch {
                                onError?.(`Could not remove ${org.publicUserData.identifier}.`)
                            }
                        }}>
                        Remove
                    </Button>
                )
            }
        }
    ]
}
