"use client";

import { ArrowLeft, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";

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
                <div className="p-6 bg-primary/10 rounded-[32px] border border-border text-center space-y-2">
                    <p className="text-primary text-sm font-bold">Ask an admin to invite you</p>
                    <p className="text-muted-foreground text-xs">Once they send the invitation, accept it from the email and you&apos;ll be added to their organization.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/onboarding?step=organization")}
                        className="h-12 w-12 shrink-0 rounded-xl"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={() => router.push("/onboarding?step=create")}
                        className="h-12 flex-1 rounded-xl text-base font-semibold"
                    >
                        Create an Organization Instead
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default JoinOrganization;
