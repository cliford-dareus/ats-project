"use client";

import { ArrowLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import OnboardingLayout from "./onboarding-layout";

// Joining an organization is by invitation only: an org admin invites the
// user by email (a Clerk organization invitation, sent via the
// create_organization_invite server action), and the invitee accepts from
// the email link. There is intentionally no endpoint that lets a signed-in
// user add themselves to an arbitrary org — the previous
// /api/organization/join route did exactly that and was removed.
const JoinOrganization = () => {
    const router = useRouter();

    return (
        <OnboardingLayout
            title={`Join an Organization`}
            subtitle="Joining is by invitation — an admin of the organization invites you by email."
            icon={Users}
        >
            <div className="space-y-6">
                <div className="p-6 bg-brand-50 rounded-[32px] border border-brand-100 text-center space-y-2">
                    <p className="text-brand-600 text-sm font-bold">Ask an admin to invite you</p>
                    <p className="text-brand-400 text-xs">Once they send the invitation, accept it from the email and you&apos;ll be added to their organization.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push("/onboarding?step=organization")}
                        className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => router.push("/onboarding?step=create")}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                    >
                        Create an Organization Instead
                    </button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default JoinOrganization;
