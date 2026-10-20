"use client";

import { ArrowRight, Building2, Mail, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import OnboardingLayout from "./onboarding-layout";

const Organization = (_props: { userId: string }) => {
    const router = useRouter();
    const { userInvitations } = useOrganizationList({
        userInvitations: { status: "pending" },
    });
    const pendingCount = userInvitations?.count ?? 0;

    return (
        <OnboardingLayout
            title="Organization"
            subtitle="Create or join an organization to collaborate with others."
            icon={Building2}
        >
            <div className="space-y-6">
                <button
                    onClick={() => router.push("/onboarding?step=join")}
                    className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                >
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                            <p className="font-bold text-zinc-900 group-hover:text-brand-700">Join with an invitation</p>
                            <p className="text-xs text-zinc-500">
                                {pendingCount > 0
                                    ? `${pendingCount} pending invitation${pendingCount === 1 ? "" : "s"}`
                                    : "Your team admin invites you by email"}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-brand-500 transform group-hover:translate-x-1 transition-all" />
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-100"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-400 font-bold">Or</span>
                    </div>
                </div>

                <button
                    onClick={() => router.push("/onboarding?step=create")}
                    className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-600 font-bold hover:border-brand-500 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create New Organization
                </button>
            </div>
        </OnboardingLayout>
    );
};

export default Organization;
