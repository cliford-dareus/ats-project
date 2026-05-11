"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
    orgId: string | null;
    orgName: string | null;
};

type EmailPayload = {
    email: string;
    orgId: string;
    orgName: string;
};

// TODO: collect  an array of invitees and
// TODO: save it to state or localStorage(whatever is best)
// TODO: send the invite after the onboarding is completed

const InviteMember = ({ orgId, orgName }: Props) => {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [, setInvitees] = useState<{ email: string, id: string }[]>([])
    const [isCreatePending, startCreateTransaction] = useTransition();
    const [email, setEmail] = useState<string>("");

    const onComplete = async () => {
        startCreateTransaction(async () => {
            const emailPayload = {
                email: email,
                orgId: orgId,
                orgName: orgName,
                subject: "Organization Invite",
            } as EmailPayload;

            if (!email || !orgId || !orgName) {
                inputRef.current?.focus();
                alert("Please fill in all fields");
                return;
            };

            try {
                const response = await fetch("/api/organization/invite", {
                    method: "POST",
                    body: JSON.stringify(emailPayload)
                });
                if (!response.ok) return
                const resend_result = await response.json();
                // Toast the user about email being sent
                setInvitees((prev) => [...prev, { email, id: resend_result }]);
            } catch (e) {
                console.error(e);
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
            colorClass="bg-blue-50 text-blue-600"
        >
            <div className="space-y-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Team Member Email</label>
                    <Input
                        type="email"
                        placeholder="colleague@company.com"
                        value={email}
                        ref={inputRef}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-3 italic text-zinc-500 text-xs text-center border-dashed">
                    Invitations will be sent as soon as you finish your setup.
                </div>

                <div className="flex gap-3 pt-2">
                    <Button onClick={() => router.back()} className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all"><ArrowLeft className="w-6 h-6" /></Button>
                    <Button
                        onClick={onComplete}
                        disabled={isCreatePending}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                    >
                        {email ? "Invite & Continue" : "Skip for Now"}
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default InviteMember;
