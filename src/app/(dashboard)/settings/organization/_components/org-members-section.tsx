"use client";

import { useMemo, useState } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import type { OrganizationInvitationStatus } from "@clerk/types";
import { DataTable } from "@/app/(dashboard)/settings/_components/data-table";
import { buildMemberColumns, OrganizationMember } from "@/app/(dashboard)/settings/_components/colunm";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import CreateOrganization from "@/app/(dashboard)/settings/_components/create-organization";
import InviteMemberDialog from "@/app/(dashboard)/settings/_components/invite-member-dialog";

const OrgMembersParams = {
    memberships: {
        pageSize: 10,
        keepPreviousData: true,
        // Infinite pagination: fetchNext() appends the next page, so
        // "Load more" grows the list instead of swapping the page.
        infinite: true as const,
    },
    invitations: {
        pageSize: 10,
        keepPreviousData: true,
        status: ["pending" as OrganizationInvitationStatus],
    },
};

/** Members table + pending invitations + Create Organization dialog (Clerk membership data). */
const OrgMembersSection = () => {
    const { isLoaded, organization, membership, memberships, invitations } = useOrganization(OrgMembersParams);
    const { user } = useUser();
    const [actionError, setActionError] = useState<string | null>(null);

    // Only org admins manage members (member:invite is org:admin-only in the
    // permission map, and role changes / removals are admin-only in Clerk).
    const canManage = membership?.role === "org:admin";

    const columns = useMemo(
        () => buildMemberColumns({ canManage, selfUserId: user?.id, onError: setActionError }),
        [canManage, user?.id]
    );

    if (!isLoaded) {
        return <>Loading</>
    };

    const memberCount = memberships?.count ?? 0;
    const pendingInvitations = invitations?.data ?? [];

    return (
        <div className="py-4">
            <div className="flex gap-4 items-center flex-wrap">
                <h1 className="font-medium text-xl">{organization?.name.toUpperCase()}</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Create New Organization</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create Organization</DialogTitle>
                            <DialogDescription>
                                Create a new organization workspace. You will be switched to it once it is created.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <CreateOrganization />
                        </div>
                    </DialogContent>
                </Dialog>
                {canManage && organization && (
                    <InviteMemberDialog
                        organizationId={organization.id}
                        onInvited={() => void invitations?.revalidate?.()}
                    />
                )}
            </div>

            {actionError && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                    {actionError}
                </p>
            )}

            <div className="mt-4">
                <p className="mb-2 text-sm text-muted-foreground">
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                </p>
                <DataTable columns={columns} data={memberships?.data as unknown as OrganizationMember[]} />
                {memberships?.hasNextPage && (
                    <div className="mt-3">
                        <Button
                            variant="outline"
                            disabled={memberships.isFetching}
                            onClick={() => memberships.fetchNext?.()}
                        >
                            {memberships.isFetching ? "Loading…" : "Load more"}
                        </Button>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <h2 className="font-medium text-lg">Pending invitations</h2>
                {pendingInvitations.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No pending invitations.</p>
                ) : (
                    <ul className="mt-2 divide-y divide-border rounded-md border">
                        {pendingInvitations.map((invitation) => (
                            <li key={invitation.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{invitation.emailAddress}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {invitation.role} · invited {invitation.createdAt.toLocaleDateString()}
                                    </p>
                                </div>
                                {canManage && (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                await invitation.revoke();
                                                await invitations?.revalidate?.();
                                            } catch {
                                                setActionError(`Could not revoke the invitation to ${invitation.emailAddress}.`);
                                            }
                                        }}
                                    >
                                        Revoke
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default OrgMembersSection;
