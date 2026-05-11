"use client";

import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, LucideCornerDownLeft, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useOrganizationList } from "@clerk/nextjs";
import OnboardingLayout from "./onboarding-layout";

const inviteeForm = z.object({
    orgId: z.string()
});

const JoinOrganization = ({ userId }: { userId: string }) => {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const showText = useDebounce(true, 800);
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();
    const { createOrganization, setActive } = useOrganizationList();

    const form = useForm<z.infer<typeof inviteeForm>>({
        resolver: zodResolver(inviteeForm),
        defaultValues: {
            orgId: "",
        },
    });

    const join = async (data: z.infer<typeof inviteeForm>) => {
        startCreateTransaction(async () => {
            try {
                if (createOrganization) {
                    const result = await fetch(`api/organization/join/?orgId=${data.orgId}`, {
                        method: "POST"
                    });
                    console.log("result", result, userId);
                    if (!result.ok) {
                        throw new Error("Failed to join organization");
                    };

                    const organization = await result.json();
                    await setActive({ organization: data.orgId });
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set("step", "success");
                    newSearchParams.set("orgId", organization.id);
                    router.push(`/onboarding?${newSearchParams.toString()}`);
                }
            } catch (error) {
                console.error(error);
            };
        });
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <OnboardingLayout
            title={`Join an Organization`}
            subtitle="You're about to join this organization. An admin might need to approve your request."
            icon={Users}
        >
            <div className="space-y-6">
                <div className="p-6 bg-brand-50 rounded-[32px] border border-brand-100 text-center space-y-2">
                    <p className="text-brand-600 text-sm font-bold">Request Access</p>
                    <p className="text-brand-400 text-xs">A notification will be sent to the team owner.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all"><ArrowLeft className="w-6 h-6" /></button>
                    <button
                        onClick={onJoin}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                    >
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default JoinOrganization;
