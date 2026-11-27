import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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
            </div>

            <OrgMembersSection />
        </div>
    )
};

export default Page;
