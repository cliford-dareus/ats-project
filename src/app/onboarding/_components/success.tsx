"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { get_app_url, ROOT_DOMAIN } from "@/lib/marketing";
import { motion } from "framer-motion";

type Props = {
    orgId: string | null;
    orgName: string | null;
    subdomain: string | null;
};

const Success = ({ orgId, orgName, subdomain }: Props) => {
    const router = useRouter();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!orgId) {
            router.push("/onboarding")
        }
    }, [router, orgId]);

    const careerUrl = subdomain ? `https://${subdomain}.${ROOT_DOMAIN}` : null;

    const copyCareerUrl = async () => {
        if (!careerUrl) return;
        try {
            await navigator.clipboard.writeText(careerUrl);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
        >
            <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                    {orgName} is ready.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Your recruitment pipeline, departments, and career portal are configured and ready for your first opening.
                </p>
            </div>

            {/* Clean summary table with tabular numerals */}
            <div className="divide-y divide-border border-y border-border text-sm">
                <div className="py-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Career Portal</span>
                    <span className="font-mono text-xs text-foreground">
                        careers.{orgDomain.replace(/^https?:\/\//, '')}
                    </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Departments</span>
                    <span className="font-mono tabular-nums text-foreground">{departmentsCount}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Team Invites Queued</span>
                    <span className="font-mono tabular-nums text-foreground">{invitedCount}</span>
                </div>
            </div>

            <button
                onClick={onFinish}
                className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export default Success;
