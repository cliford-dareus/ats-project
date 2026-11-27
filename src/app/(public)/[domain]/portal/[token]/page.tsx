import Link from "next/link";
import { get_portal_data_by_token } from "@/server/portal/portal-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PortalApplicationCard from "../_components/portal-application-card";

// Public portal page: https://{subdomain}.{root}/portal/{token}
// No Clerk auth — the token IS the only credential. No candidate or
// application id is ever taken from the URL or body; all data comes from
// get_portal_data_by_token, which returns null for invalid, expired or
// revoked tokens.
const PortalTokenPage = async ({
    params,
}: {
    params: Promise<{ domain: string; token: string }>;
}) => {
    const { domain, token } = await params;

    const data = await get_portal_data_by_token(token);

    // One generic page for every unusable token — invalid, expired or
    // revoked are never distinguished.
    if (!data) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
                <main className="pb-20">
                    <div className="max-w-2xl mx-auto px-4 py-20">
                        <Card className="p-12 text-center">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                                This link is invalid or expired
                            </h1>
                            <p className="text-zinc-500 mb-8">
                                Portal links expire for security. Request a new
                                one and we&apos;ll send it to the email address
                                you applied with.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Button asChild size="lg">
                                    <Link href={`/${domain}/portal`}>Request a new link</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <Link href={`/${domain}`}>Back to Careers</Link>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    const firstName = data.candidate.name?.trim().split(/\s+/)[0];

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
            <main className="pb-20">
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">
                            {firstName ? `Hello, ${firstName}` : "Hello"}
                        </h1>
                        <p className="text-zinc-500">
                            Here&apos;s the status of your application
                            {data.applications.length === 1 ? "" : "s"} with{" "}
                            {data.orgName}.
                        </p>
                    </div>

                    {data.applications.length === 0 ? (
                        <Card className="p-12 text-center">
                            <h2 className="text-xl font-bold text-zinc-900 mb-2">
                                No applications found
                            </h2>
                            <p className="text-zinc-500 mb-8">
                                We don&apos;t have any applications linked to this
                                portal link right now.
                            </p>
                            <Button asChild size="lg">
                                <Link href={`/${domain}`}>View Open Roles</Link>
                            </Button>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {data.applications.map((application) => (
                                <PortalApplicationCard
                                    key={application.id}
                                    application={application}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PortalTokenPage;
