"use client";

import { ArrowRight, Building2, Plus, UserPlus } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUGGESTED_ORGS = [
  { id: 'org-1', name: 'Design Studio', domain: 'designstudio.com', rolesCount: 8, membersCount: 14 },
  { id: 'org-2', name: 'TechFlow', domain: 'techflow.io', rolesCount: 12, membersCount: 29 }
];

const Organization = ({ userId }: { userId: string }) => {
    const router = useRouter();
    const { userInvitations } = useOrganizationList({
        userInvitations: { status: "pending" },
    });
    const pendingCount = userInvitations?.count ?? 0;

    if (!userId) {
        redirect("/sign-in");
    }

    const onSelectOrg = (orgId: string, orgName: string, orgDomain: string) => {
        router.push(`/onboarding/workspace-dock?orgId=${orgId}&orgName=${encodeURIComponent(orgName)}&orgDomain=${orgDomain}`);
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
                <p className="text-xs font-medium text-muted-foreground">Suggested workspaces</p>
                <div className="space-y-2.5">
                    {SUGGESTED_ORGS.map((org) => (
                        <button
                            key={org.id}
                            onClick={() => onSelectOrg(org.id, org.name, org.domain)}
                            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/60 hover:bg-secondary transition-all group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                        {org.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {org.domain} · <span className="tabular-nums">{org.rolesCount}</span> open roles
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                    ))}
                </div>
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
