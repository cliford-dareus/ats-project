"use client";

import { create_organization_action } from "@/server/actions/organization_actions";
import { useOrganizationList } from "@clerk/nextjs";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROOT_DOMAIN } from "@/lib/marketing";

const CreateOrganization = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();
    const { createOrganization, setActive } = useOrganizationList();

    const [displayName, setDisplayName] = useState("");
    const [slug, setSlug] = useState("");
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkAvailability() {
            if (!displayName) {
                setIsAvailable(null);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/organization/check?subdomain=${slug}`);
                if (!res.ok) {
                    setIsAvailable(null);
                    return;
                }
                const data = await res.json();
                setIsAvailable(data.available);
            } catch (err) {
                console.error(err);
                setIsAvailable(null);
            } finally {
                setLoading(false);
            }
        }

        const debounceFn = setTimeout(() => {
            checkAvailability();
        }, 500);

        return () => clearTimeout(debounceFn);
    }, [displayName, slug]);

    const isValid = slug.length >= 3 && isAvailable === true;

    const onCreated = useCallback(async () => {
        if (!isValid || !createOrganization) return;

        setError(null);
        startCreateTransaction(async () => {
            try {
                const newOrg = await createOrganization({ name: displayName || slug });

                await setActive({ organization: newOrg.id });

                // this will handle in the webhook 'organization.created'
                await create_organization_action({
                    clerk_id: newOrg.id,
                    name: newOrg.name,
                    subdomain: slug.toLowerCase(),
                });

                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("step", "department");
                newSearchParams.set("orgId", newOrg.id);
                newSearchParams.set("orgName", newOrg.name);
                newSearchParams.set("subdomain", slug.toLowerCase());

                router.push(`/onboarding?${newSearchParams.toString()}`);
            } catch (err) {
                console.error("Failed to create organization:", err);
                setError("Something went wrong while creating your organization. Please try again.");
            }
        });
    }, [isValid, createOrganization, displayName, slug, setActive, searchParams, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDisplayName(value);

        const cleanSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        setSlug(cleanSlug);
    };

    return (
        <OnboardingLayout
            title="Create Organization"
            subtitle="Enter your organization name to get started."
            icon={Plus}
        >
            <div className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="company-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</label>
                    <Input
                        id="company-name"
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={displayName}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl"
                    />
                </div>

                {slug.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        Your career page:{" "}
                        <span className="font-mono text-foreground">
                            {slug}.{ROOT_DOMAIN}
                        </span>
                    </p>
                )}

                {/* Status Indicator */}
                <div className="text-sm">
                    {loading && (
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Checking availability...
                        </p>
                    )}
                    {isAvailable === true && (
                        <p className="text-primary flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            This URL is available!
                        </p>
                    )}
                    {isAvailable === false && (
                        <p className="text-destructive flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Sorry, that name is taken.
                        </p>
                    )}
                </div>

                {error && (
                    <p role="alert" className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-2">
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
                        onClick={onCreated}
                        disabled={!isValid || isCreatePending}
                        className="h-12 flex-1 rounded-xl text-base font-semibold"
                    >
                        {isCreatePending ? "Creating..." : "Create & Continue"}
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default CreateOrganization;
