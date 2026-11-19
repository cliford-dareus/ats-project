"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingLayout from "./onboarding-layout";
import { Check, CheckCircle2, Copy, Globe } from "lucide-react";
import { get_app_url, ROOT_DOMAIN } from "@/lib/marketing";

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
        <OnboardingLayout
            title="You're all set!"
            subtitle={
                orgName
                    ? `${orgName} is ready. Start by posting your first job opening.`
                    : "Your organization is ready. Start by posting your first job opening."
            }
            icon={CheckCircle2}
        >
            <div className="space-y-4">
                {careerUrl && (
                    <div className="p-4 bg-muted rounded-2xl border border-border space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Your career page
                        </p>
                        <div className="flex items-center gap-2">
                            <p className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
                                {careerUrl}
                            </p>
                            <button
                                type="button"
                                onClick={copyCareerUrl}
                                aria-label={copied ? "Copied" : "Copy career page URL"}
                                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {copied ? "Copied to clipboard." : "Share this link so candidates can find your open roles."}
                        </p>
                    </div>
                )}
                <a
                    href={`${get_app_url()}/dashboard`}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Go to Dashboard
                </a>
                <a
                    href={`${get_app_url()}/jobs/new`}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-base font-semibold text-foreground hover:bg-muted transition-colors"
                >
                    Post your first job
                </a>
            </div>
        </OnboardingLayout>
    );
};

export default Success;
