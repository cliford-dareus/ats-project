"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { request_portal_link_action } from "@/server/actions/portal-actions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The message is deliberately the same whether or not the address ever
// applied here — the action itself always returns a generic success shape,
// and this form never reveals whether an account exists for the email.
const GENERIC_MESSAGE =
    "If an account with that email applied here, a link is on its way. Please check your inbox (and spam folder) for an email from us.";

const RequestPortalLinkForm = ({
    subdomain,
    companyName,
}: {
    subdomain: string;
    companyName: string;
}) => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        const trimmed = email.trim();
        if (!EMAIL_PATTERN.test(trimmed)) {
            setError("Please enter a valid email address.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            // The action is public and always resolves with a generic
            // success shape; whatever it returns, the reply shown is the
            // same generic message.
            await request_portal_link_action(trimmed, subdomain);
            setSent(true);
        } catch (err) {
            console.error("Error requesting portal link:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sent) {
        return (
            <Card className="p-8 sm:p-12 text-center">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Check your inbox</h1>
                <p className="text-zinc-500 mb-8">{GENERIC_MESSAGE}</p>
                <Button asChild size="lg">
                    <Link href={`/${subdomain}`}>Back to Careers</Link>
                </Button>
            </Card>
        );
    }

    return (
        <Card className="p-8 sm:p-12">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                Check your application status
            </h1>
            <p className="text-zinc-500 mb-8">
                Enter the email address you applied to {companyName} with and
                we&apos;ll send you a secure link to view your applications.
            </p>
            <form onSubmit={onSubmit}>
                <label
                    htmlFor="portal-email"
                    className="block text-sm font-medium text-zinc-900 mb-2"
                >
                    Email address
                </label>
                <input
                    id="portal-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                />
                <Button type="submit" size="lg" disabled={isSubmitting} className="mt-6 w-full">
                    {isSubmitting ? "Sending…" : "Send me my link"}
                </Button>
                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}
            </form>
        </Card>
    );
};

export default RequestPortalLinkForm;
