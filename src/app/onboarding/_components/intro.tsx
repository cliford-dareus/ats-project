"use client";

import { useRouter } from "next/navigation";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, Globe, Users, Zap } from "lucide-react";

const Intro = () => {
    const router = useRouter();

    return (
        <OnboardingLayout
            title="Welcome to Applico"
            subtitle="Hiring in sequence, not in chaos. Post jobs, track candidates, and schedule interviews — all in one place."
            icon={Zap}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { icon: Briefcase, text: "Manage job openings effortlessly" },
                        { icon: Users, text: "Track candidates throughout the pipeline" },
                        { icon: Globe, text: "Build a beautiful career page in minutes" }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-muted rounded-2xl border border-border">
                            <item.icon className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{item.text}</span>
                        </div>
                    ))}
                </div>
                <Button
                    onClick={() => router.push("/onboarding?step=organization")}
                    className="h-12 w-full rounded-xl text-base font-semibold group"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </OnboardingLayout>
    );
};

export default Intro;
