"use client";

import { useRouter } from "next/navigation";
import OnboardingLayout from "./onboarding-layout";
import { ArrowRight, Briefcase, Globe, Users, Zap } from "lucide-react";

const Intro = () => {
    const router = useRouter();

    return (
        <OnboardingLayout
            title="Welcome to TalentPortal"
            subtitle="The all-in-one platform to manage your recruitment pipeline and build your company culture."
            icon={Zap}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: Briefcase, text: "Manage job openings effortlessly" },
                        { icon: Users, text: "Track candidates throughout the pipeline" },
                        { icon: Globe, text: "Build a beautiful career page in minutes" }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <item.icon className="w-5 h-5 text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-700">{item.text}</span>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => router.push("/onboarding?step=organization")}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </OnboardingLayout>
    );
};

export default Intro;
