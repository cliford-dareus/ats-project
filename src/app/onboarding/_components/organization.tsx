"use client";

import { ArrowRight, Plus, UserPlus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import { motion } from "motion/react";

const Organization = ({ userId }: { userId: string }) => {
    const router = useRouter();
    const { userInvitations } = useOrganizationList({
        userInvitations: { status: "pending" },
    });
    const pendingCount = userInvitations?.count ?? 0;

    if (!userId) {
        redirect("/sign-in");
    }

    const onJoinByInvitation = () => {
        router.push("/onboarding?step=join");
    };

    const onCreateNew = () => {
        router.push("/onboarding?step=create");
    };

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
                    Choose your organization
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Join an existing team workspace or initialize a new hiring environment.
                </p>
            </div>

            <div className="space-y-3">
                <button
                    onClick={onJoinByInvitation}
                    className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/60 hover:bg-secondary transition-all group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                Join by invitation
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {pendingCount > 0
                                    ? `${pendingCount} pending invitation${pendingCount === 1 ? "" : "s"}`
                                    : "Your team admin invites you by email"}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
            </div>

            <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">or</span>
                </div>
            </div>

            <button
                onClick={onCreateNew}
                className="w-full py-3.5 px-5 border border-dashed border-border rounded-2xl text-foreground text-sm font-semibold hover:border-primary/70 hover:bg-primary/[0.05] hover:text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <Plus className="w-4 h-4 text-primary" />
                <span>Create New Organization</span>
            </button>
        </motion.div>
    );
};

export default Organization;
