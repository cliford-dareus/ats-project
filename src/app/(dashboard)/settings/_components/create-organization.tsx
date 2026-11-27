'use client'

import React, { FormEvent, useState } from 'react';
import { useOrganizationList, useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { create_organization_action } from "@/server/actions/organization_actions";


const CreateOrganization = () => {
    const { user } = useUser();
    const [orgName, setOrgName] = useState<string>("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { createOrganization, setActive } = useOrganizationList();

    if (!user) return null

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedName = orgName.trim();
        if (!createOrganization || !trimmedName) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const new_org = await createOrganization({ name: trimmedName });
            await setActive({ organization: new_org.id })
            // Create the Applico DB row, like onboarding does — without it
            // the org has no profile and the org/settings pages break for it.
            // Slug derived from the name the same way onboarding derives it.
            const subdomain = trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            try {
                await create_organization_action({
                    clerk_id: new_org.id,
                    name: new_org.name,
                    subdomain,
                });
            } catch (dbErr) {
                // The Clerk org exists, but it has no Applico profile — say
                // so honestly instead of silently continuing.
                setError(
                    `Organization "${new_org.name}" was created, but its Applico profile could not be saved` +
                    `${dbErr instanceof Error ? `: ${dbErr.message}` : "."} ` +
                    `It has no Applico profile yet — please try again from onboarding or contact support.`
                );
                return;
            }
            setOrgName("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the organization. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name"
                aria-label="Organization name"
            />
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <Button type="submit" disabled={!orgName.trim() || isSubmitting}>
                {isSubmitting ? "Creating…" : "Create organization"}
            </Button>
        </form>
    );
};

export default CreateOrganization;
