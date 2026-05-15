import React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import OrganizationSwitcher from "@/components/organization_switcher";
import { redirect } from "next/navigation";
import AuthDropdown from "@/components/auth-dropdown";
import Provider from "@/providers/providers";
import { db } from "@/drizzle/db";
import { organization } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { create_organization_action } from "@/server/actions/organization_actions";

type Props = {
    children: React.ReactNode;
};

export type StageCountType = {
    stageId: number;
    stages: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null;
    count: number;
    color: string;
};

const Layout = async ({ children }: Props) => {
    const user = await currentUser();
    if (!user) {
        return redirect("/sign-in");
    }

    const { orgId, orgSlug } = await auth();
    if (!orgId || !orgSlug) {
        return redirect("/onboarding");
    }

    const org = await db.select().from(organization).where(eq(organization.clerk_id, orgId));
    if (org.length == 0) {
        const org_name = orgSlug?.split("-")[0];
        await create_organization_action({ clerk_id: orgId, name: org_name, subdomain: org_name.toLowerCase() });
    }

    return (
        <div className="min-h-screen">
            <Provider orgId={orgId as string}>
                <AppSidebar />
                <SidebarInset>
                    <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <OrganizationSwitcher />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <div className="ml-auto flex items-center gap-4">
                            <Bell size={18} />
                            <Button className="!p-0 border rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2">
                                <Link
                                    href="/jobs/new"
                                    className="flex items-center gap-2 px-4 !py-2 "
                                >
                                    <Plus size={20} />
                                    <p>Create New Job</p>
                                </Link>
                            </Button>
                            <AuthDropdown user={user} orgId={orgId} />
                        </div>
                    </header>

                    <div className="h-[calc(100vh-69px)] max-w-7xl w-full mx-auto overflow-scroll no-scrollbar">
                        {children}
                    </div>
                </SidebarInset>
            </Provider>
        </div>
    );
};

export default Layout;
