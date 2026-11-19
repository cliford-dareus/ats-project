"use client";

import { ArrowRight, Building2, Plus, UserPlus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import OnboardingLayout from "./onboarding-layout";

const Organization = ({ userId }: { userId: string }) => {
    const router = useRouter();
    const { userInvitations } = useOrganizationList({
        userInvitations: { status: "pending" },
    });
    const pendingCount = userInvitations?.count ?? 0;

    if (!userId) {
        redirect("/sign-in");
    }

    return (
        <OnboardingLayout
            title="Organization"
            subtitle="Create or join an organization to collaborate with others."
            icon={Building2}
        >
            <div className="space-y-3">
                <button
                    onClick={() => router.push("/onboarding?step=create")}
                    className="flex w-full items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all group text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Create a new organization</p>
                            <p className="text-sm text-muted-foreground">Set up a new workspace for your company.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button
                    onClick={() => router.push("/onboarding?step=join")}
                    className="flex w-full items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all group text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Join by invitation</p>
                            <p className="text-sm text-muted-foreground">
                                {pendingCount > 0
                                    ? `${pendingCount} pending invitation${pendingCount === 1 ? "" : "s"}`
                                    : "Your team admin invites you by email."}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
            </div>
        </OnboardingLayout>
    );
};

export default Organization;
