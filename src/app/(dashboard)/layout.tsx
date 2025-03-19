import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import {
  get_all_candidates_action,
  get_candidates_stage_count_action,
} from "@/server/actions/candidates-actions";
import { CandidatesResponseType } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { NewJobContextProvider } from "@/providers/new-job-provider";
import OrganizationSwitcher from "@/components/organization_switcher";
import { redirect } from "next/navigation";
import { PluginProvider } from "@/providers/plugins-provider";
import { TriggerProvider } from "@/providers/trigger-provider";
import AuthDropdown from "@/components/auth-dropdown";

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
  const { orgId } = await auth();

  if (!user) {
    return redirect("/sign-in");
  }

  const result = await get_all_candidates_action({ limit: 0, offset: 0 });
  const candidate = Array.isArray(result) ? result[1] : [];
  const stagesCount = await get_candidates_stage_count_action();

  return (
    <PluginProvider orgId={orgId as string}>
      <TriggerProvider>
        <NewJobContextProvider>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "350px",
              } as React.CSSProperties
            }
          >
            <AppSidebar
              candidate={candidate as CandidatesResponseType[]}
              stagescount={stagesCount as StageCountType[]}
            />
            <SidebarInset>
              <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <OrganizationSwitcher />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="ml-auto flex items-center gap-4">
                  <Button className="p-0">
                    <Link
                      href="/jobs/new"
                      className="flex items-center gap-2 w-full h-full px-4 py-1.5"
                    >
                      <Plus size={20} />
                      <p>Create New Job</p>
                    </Link>
                  </Button>

                  <Bell size={18} />
                  <AuthDropdown user={user} orgId={orgId} />
                </div>
              </header>
              <>{children}</>
            </SidebarInset>
          </SidebarProvider>
        </NewJobContextProvider>
      </TriggerProvider>
    </PluginProvider>
  );
};

export default Layout;
