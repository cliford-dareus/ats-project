import React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import OrganizationSwitcher from "@/components/organization_switcher";
import { redirect } from "next/navigation";
import AuthDropdown from "@/components/auth-dropdown";
import Provider from "@/providers/providers";
import { ensure_organization_row } from "@/server/queries/drizzle/organization";
import { ThemeToggle } from "@/components/theme-toggle";
import NotificationDropdown from "@/components/notification-dropdown";
import GlobalSearch from "@/components/global-search";

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
    if (!orgId) {
        return redirect("/onboarding");
    }

    // Session org is authoritative; make sure its local row exists.
    await ensure_organization_row(orgId, orgSlug ?? "");

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground antialiased">
            {/* Subtle architectural grid & ambient glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:64px_64px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed top-[-18%] right-[8%] w-[520px] h-[520px] rounded-full bg-primary/[0.08] blur-[140px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed bottom-[-18%] left-[4%] w-[420px] h-[420px] rounded-full bg-accent/[0.05] blur-[140px]"
            />
            <div className="relative z-10">
                <Provider orgId={orgId as string}>
                    <AppSidebar />
                    <SidebarInset>
                        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <OrganizationSwitcher />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <div className="ml-auto flex items-center gap-2">
                            <GlobalSearch />
                            <ThemeToggle />
                            <NotificationDropdown />
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
        </div>
    );
};

export default Layout;
