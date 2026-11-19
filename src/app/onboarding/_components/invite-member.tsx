"use client";

import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { create_organization_invite } from "@/server/actions/organization_actions";

type Props = {
    orgId: string | null;
    orgName: string | null;
    subdomain: string | null;
};

const InviteMember = ({ orgId, orgName, subdomain }: Props) => {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [, setInvitees] = useState<{ email: string, id: string }[]>([])
    const [isCreatePending, startCreateTransaction] = useTransition();
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const goToSuccess = () => {
        const params = new URLSearchParams({ step: "success" });
        if (orgId) params.set("orgId", orgId);
        if (orgName) params.set("orgName", orgName);
        if (subdomain) params.set("subdomain", subdomain);
        router.push(`/onboarding?${params.toString()}`);
    };

    // Sends a real Clerk organization invitation via the server action — the
    // single invite path. The action uses the session orgId only (never the
    // client-supplied orgId) and requires the member:invite permission.
    // The invitation email goes out immediately.
    const onComplete = async () => {
        startCreateTransaction(async () => {
            if (!email || !orgId || !orgName) {
                inputRef.current?.focus();
                setError("Please fill in all fields");
                return;
            };

            try {
                const invitationId = await create_organization_invite({
                    organizationId: orgId,
                    emailAddress: email,
                });
                setInvitees((prev) => [...prev, { email, id: invitationId }]);
                setEmail("");
                goToSuccess();
            } catch (e) {
                console.error(e);
                setError("Could not send the invitation. Please try again.");
            }
        });
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <OnboardingLayout
            title="Invite Team Members"
            subtitle="Grant your colleagues access to start reviewing candidates together."
            icon={Mail}
        >
            <div className="space-y-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Member Email</label>
                    <Input
                        type="email"
                        placeholder="colleague@company.com"
                        value={email}
                        ref={inputRef}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        className="h-12 rounded-xl"
                    />
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="p-4 bg-muted rounded-2xl border border-dashed border-border flex items-center gap-3 text-muted-foreground text-xs text-center">
                    The invitation email is sent immediately.
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-12 w-12 shrink-0 rounded-xl"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={
                            () => { if (email) { onComplete(); } else { goToSuccess(); } }}
                        disabled={isCreatePending}
                        className="h-12 flex-1 rounded-xl text-base font-semibold"
                    >
                        {email ? "Invite & Continue" : "Skip for Now"}
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default InviteMember;
