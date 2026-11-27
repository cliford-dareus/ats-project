"use client";

import { useEffect, useRef, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import type { OrganizationCustomRoleKey } from "@clerk/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { create_organization_invite } from "@/server/actions/organization_actions";

type InviteMemberDialogProps = {
    /** Clerk id of the organization to invite into (the active session org). */
    organizationId: string;
    /** Called after an invitation is sent, so the caller can refresh its lists. */
    onInvited?: () => void;
};

/**
 * Admin-only "Invite member" dialog. The role list comes from the org's real
 * Clerk roles (organization.getRoles), defaulting to org:member, and the
 * invite goes through the server action, which validates the role and
 * enforces the session org server-side. Success and the server's real error
 * message are shown inline in the dialog.
 */
const InviteMemberDialog = ({ organizationId, onInvited }: InviteMemberDialogProps) => {
    const { organization } = useOrganization();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [roles, setRoles] = useState<OrganizationCustomRoleKey[]>([]);
    const [role, setRole] = useState<OrganizationCustomRoleKey>("org:member");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fetchedRolesForOrg = useRef<string | null>(null);

    // Same pattern as SelectRole: the org's real roles, pageSize 20.
    useEffect(() => {
        if (!open || !organization) return;
        if (fetchedRolesForOrg.current === organization.id) return;
        let cancelled = false;
        organization
            ?.getRoles({ pageSize: 20 })
            .then((res) => {
                if (cancelled) return;
                fetchedRolesForOrg.current = organization.id;
                const keys = res.data.map((r) => r.key as OrganizationCustomRoleKey);
                setRoles(keys);
                // Keep org:member as the default when the org has it; otherwise
                // fall back to the first real role.
                if (keys.length > 0 && !keys.includes("org:member")) {
                    setRole(keys[0]);
                }
            })
            .catch(() => {
                // Role list failed to load — keep the safe org:member default;
                // the server action validates the role before calling Clerk.
                if (!cancelled) setRoles(["org:member"]);
            });
        return () => {
            cancelled = true;
        };
    }, [open, organization]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !trimmedEmail.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);
        try {
            await create_organization_invite({
                organizationId,
                emailAddress: trimmedEmail,
                role,
            });
            setSuccess(`Invitation sent to ${trimmedEmail}.`);
            setEmail("");
            onInvited?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send the invitation. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setError(null); setSuccess(null); } }}>
            <DialogTrigger asChild>
                <Button>Invite member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join this organization. The invitee accepts by email.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        aria-label="Email address"
                    />
                    <select
                        aria-label="Member role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as OrganizationCustomRoleKey)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {(roles.length > 0 ? roles : ["org:member" as OrganizationCustomRoleKey]).map((roleKey) => (
                            <option key={roleKey} value={roleKey}>
                                {roleKey}
                            </option>
                        ))}
                    </select>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p role="status" className="text-sm text-green-600">
                            {success}
                        </p>
                    )}
                    <Button type="submit" disabled={!email.trim() || isSubmitting}>
                        {isSubmitting ? "Sending…" : "Send invitation"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InviteMemberDialog;
