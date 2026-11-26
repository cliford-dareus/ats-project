import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, Shield, Zap } from "lucide-react";
import { hasPermission } from "@/server/permissions";
import { get_general_settings_action } from "@/server/actions/organization_actions";
import type { GeneralSettingsInput } from "@/zod";
import OrgProfileCard from "./_components/org-profile-card";
import OrgMembersSection from "./_components/org-members-section";

const Page = async () => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/onboarding");

    // The org may exist in Clerk with no DB row yet — the profile card
    // shows a setup notice instead of taking the whole page down.
    let initial: GeneralSettingsInput | null = null;
    try {
        initial = await get_general_settings_action();
    } catch {
        initial = null;
    }

    const canManage =
        orgRole === "org:admin" || (await hasPermission("settings:manage"));
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

    return (
        <div className="p-4">
            <div className="space-y-8">
                <OrgProfileCard initial={initial} rootDomain={rootDomain} canManage={canManage} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">Security Policy</h4>
                            <p className="text-xs text-muted-foreground mt-1">Manage single sign-on and 2FA requirements.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Configure <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">API Access</h4>
                            <p className="text-xs text-muted-foreground mt-1">Generate API keys for custom integrations.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Manage Keys <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">Email Branding</h4>
                            <p className="text-xs text-muted-foreground mt-1">Custom domains and email templates.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Set Up <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <OrgMembersSection />
        </div>
    )
};

export default Page;
