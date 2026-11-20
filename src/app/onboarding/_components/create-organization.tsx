"use client";

import { create_organization_action } from "@/server/actions/organization_actions";
import { useOrganizationList } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ROOT_DOMAIN } from "@/lib/marketing";
import { motion } from "framer-motion";

interface CreateOrganizationProps {
    orgName: string;
    orgDomain: string;
    onNameChange: (value: string) => void;
    onDomainChange: (value: string) => void;
}

const CreateOrganization = ({
    orgName,
    orgDomain,
    onNameChange,
    onDomainChange,
}: CreateOrganizationProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isCreatePending, startCreateTransaction] = useTransition();
    const { createOrganization, setActive } = useOrganizationList();

    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkAvailability() {
            if (!orgDomain) {
                setIsAvailable(null);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/organization/check?subdomain=${orgDomain}`);
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
    }, [orgDomain]);

    useEffect(() => {
        if (!orgName) {
            onDomainChange("");
            return;
        }
        const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        onDomainChange(slug);
    }, [orgName, onDomainChange]);

    const isValid = orgDomain.length >= 3 && isAvailable === true;

    const onCreated = useCallback(async () => {
        if (!isValid || !createOrganization) return;

        setError(null);
        startCreateTransaction(async () => {
            try {
                const newOrg = await createOrganization({ name: orgName, slug: orgDomain });

                await setActive({ organization: newOrg.id });

                // this will handle in the webhook 'organization.created'
                await create_organization_action({
                    clerk_id: newOrg.id,
                    name: newOrg.name,
                    subdomain: orgDomain.toLowerCase(),
                });

                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("step", "department");
                newSearchParams.set("orgId", newOrg.id);
                newSearchParams.set("orgName", newOrg.name);
                newSearchParams.set("subdomain", orgDomain.toLowerCase());

                router.push(`/onboarding?${newSearchParams.toString()}`);
            } catch (err) {
                console.error("Failed to create organization:", err);
                setError("Something went wrong while creating your organization. Please try again.");
            }
        });
    }, [isValid, createOrganization, orgName, orgDomain, setActive, searchParams, router]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onCreated();
    }, [onCreated]);

    const onBack = useCallback(() => {
        router.back();
    }, [router]);

    return (
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
        >
            <div className="space-y-2">
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                    Create your organization
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Your company name and domain configure your live career portal immediately.
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="org-name" className="text-xs font-medium text-muted-foreground block">
                        Company Name
                    </label>
                    <input
                        id="org-name"
                        type="text"
                        autoFocus
                        placeholder="e.g. Acme Studio"
                        value={orgName}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="w-full px-4 py-3 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                </div>

                {/* Status Indicator */}
                <div className="text-sm">
                    {loading && <p className="text-gray-500">Checking availability...</p>}
                    {isAvailable === true &&
                        <p className="text-green-600">✓ This URL is available!</p>}
                    {isAvailable === false &&
                        <p className="text-red-600">✗ Sorry, that name is taken.</p>}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="org-domain" className="text-xs font-medium text-muted-foreground block">
                        Company Website
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id="org-domain"
                            type="text"
                            placeholder="acme.com"
                            value={orgDomain}
                            onChange={(e) => onDomainChange(e.target.value)}
                            className="w-full px-4 py-3 bg-card border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                        />
                        <span className="text-sm text-muted-foreground">.{ROOT_DOMAIN}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="p-3.5 bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-colors cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    type="submit"
                    disabled={!orgName.trim()}
                    className="flex-1 py-3.5 px-6 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                    <span>Create & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.form>
    );
};

export default CreateOrganization;
