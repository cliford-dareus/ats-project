"use client";

import { create_organization_action } from "@/server/actions/organization_actions";
import { useOrganizationList } from "@clerk/nextjs";
import { ArrowLeft, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import OnboardingLayout from "./onboarding-layout";
import { Button } from "@/components/ui/button";

const CreateOrganization = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();

    const { createOrganization, setActive } = useOrganizationList();

    const [displayName, setDisplayName] = useState("");
    const [slug, setSlug] = useState("");
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

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

        startCreateTransaction(async () => {
            try {
                const newOrg = await createOrganization({ name: displayName || slug });

                await setActive({ organization: newOrg.id });

                await create_organization_action({
                    clerk_id: newOrg.id,
                    name: newOrg.name,
                    subdomain: slug.toLowerCase(),
                });

                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("step", "department");
                newSearchParams.set("orgId", newOrg.id);
                newSearchParams.set("orgName", newOrg.name);

                router.push(`/onboarding?${newSearchParams.toString()}`);
            } catch (err) {
                console.error("Failed to create organization:", err);
                // TODO: Show toast error
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
            colorClass="bg-emerald-50 text-emerald-600"
        >
            <div className="space-y-6">
                <div className="space-y-4 flex items-center gap-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Company Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Acme Corp"
                            value={displayName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    <span className="font-mono text-emerald-600 font-medium">
                        .youratshub.com
                    </span>
                </div>

                {/* Status Indicator */}
                <div className="mt-2 text-sm">
                    {loading && <p className="text-gray-500">Checking availability...</p>}
                    {isAvailable === true &&
                        <p className="text-green-600">✓ This URL is available!</p>}
                    {isAvailable === false &&
                        <p className="text-red-600">✗ Sorry, that name is taken.</p>}
                </div>

                <div className="flex gap-3 pt-2">
                    <Button className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-all">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <Button
                        onClick={onCreated}
                        disabled={isCreatePending}
                        className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                        Create & Continue
                    </Button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default CreateOrganization;
