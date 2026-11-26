"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { create_organization_invite } from "@/server/actions/organization_actions";
import { motion } from "motion/react";
import { InvitedMember } from "./onboarding";

type Props = {
    orgId: string | null;
    orgName: string | null;
    subdomain: string | null;
    invitedMembers: InvitedMember[];
    setInvitedMembers: React.Dispatch<React.SetStateAction<InvitedMember[]>>;
};

const InviteMember = ({ orgId, orgName, subdomain, invitedMembers, setInvitedMembers }: Props) => {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [, startCreateTransaction] = useTransition();
    const [email, setEmail] = useState<string>("");
    const [role, setRole] = useState<'Recruiter' | 'Hiring Lead' | 'Interviewer'>('Hiring Lead');
    const [error, setError] = useState<string | null>(null);

    const goToSuccess = () => {
        const params = new URLSearchParams({ step: "success" });
        if (orgId) params.set("orgId", orgId);
        if (orgName) params.set("orgName", orgName);
        if (subdomain) params.set("subdomain", subdomain);
        router.push(`/onboarding?${params.toString()}`);
    };

    // Queues an invite locally only — no invitation is sent here. Invites are
    // sent when the user continues (see handleContinue).
    const handleAddInvite = () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setError("Please enter a valid email address");
            return;
        }
        setInvitedMembers((prev) => [
            ...prev,
            { id: crypto.randomUUID(), email: trimmedEmail, role },
        ]);
        setEmail("");
        setError(null);
    };

    const handleRemoveInvite = (id: string) =>
        setInvitedMembers((prev) => prev.filter((m) => m.id !== id));

    // Sends each queued invite via the server action, sequentially. The action
    // uses the session orgId and rejects a mismatched client orgId. If nothing
    // is queued and no valid email is typed, this is "Skip for Now" and goes
    // straight to success.
    const handleContinue = () => {
        startCreateTransaction(async () => {
            const trimmedEmail = email.trim();
            let members = invitedMembers;
            if (trimmedEmail) {
                if (!trimmedEmail.includes('@')) {
                    setError("Please enter a valid email address");
                    return;
                }
                members = [...invitedMembers, { id: crypto.randomUUID(), email: trimmedEmail, role }];
                setInvitedMembers(members);
                setEmail("");
                setError(null);
            }
            if (members.length === 0) {
                goToSuccess();
                return;
            }
            try {
                for (const member of members) {
                    await create_organization_invite({
                        organizationId: orgId!,
                        emailAddress: member.email,
                    });
                }
                goToSuccess();
            } catch (e) {
                console.error(e);
                setError("Could not send the invitation. Please try again.");
            }
        });
    };

    const onBack = () => router.push('/onboarding?step=department');

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
        >
            <div className="space-y-2">
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                    Invite collaborators
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Add hiring managers and recruiters to collaborate inside {orgName}.
                </p>
            </div>

            <div className="space-y-3">
                <label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground block">
                    Team Member Email
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInvite();
                            }
                        }}
                        className="flex-1 px-4 py-3 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <select
                        aria-label="Member role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as InvitedMember['role'])}
                        className="px-3 py-3 bg-card border border-input rounded-xl text-xs font-medium text-foreground focus:outline-none focus:border-primary"
                    >
                        <option value="Hiring Lead">Hiring Lead</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="Interviewer">Interviewer</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleAddInvite}
                        disabled={!email.trim() || !email.includes('@')}
                        className="px-4 py-3 bg-secondary border border-border text-foreground rounded-xl hover:border-primary/60 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs font-semibold"
                    >
                        Add
                    </button>
                </div>

                {/* Pending Invites List */}
                {invitedMembers.length > 0 ? (
                    <div className="divide-y divide-border border border-border rounded-2xl bg-card px-4">
                        {invitedMembers.map((member) => (
                            <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{member.email}</p>
                                    <p className="text-[11px] text-muted-foreground">{member.role}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveInvite(member.id)}
                                    aria-label={`Remove ${member.email}`}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground pt-1">
                        Invitations are queued and sent once your workspace finishes provisioning.
                    </p>
                )}
            </div>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="p-3.5 bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-colors cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={handleContinue}
                    className="flex-1 py-3.5 px-6 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                    <span>{invitedMembers.length > 0 || email.includes('@') ? 'Invite & Continue' : 'Skip for Now'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

export default InviteMember;
