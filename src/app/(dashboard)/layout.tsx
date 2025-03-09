import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React from "react";
import {get_all_candidates_action, get_candidates_stage_count_action} from "@/server/actions/candidates-actions";
import {CandidatesResponseType} from "@/types/job-listings-types";
import {Separator} from "@/components/ui/separator";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Bell, ChevronDown, LogOut, Plus} from "lucide-react";
import {auth, currentUser} from "@clerk/nextjs/server";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {NewJobContextProvider} from "@/providers/new-job-provider";
import OrganizationSwitcher from "@/components/organization_switcher";
import {redirect} from "next/navigation";
import {PluginProvider} from "@/providers/plugins-provider";

type Props = {
    children: React.ReactNode
}

export type StageCountType = {
    stageId: number
    stages: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null
    count: number
    color: string
}

const Layout = async ({children}: Props) => {
    const user = await currentUser();
    const {orgId} = await auth()

    if (!user) {
        return redirect("/sign-in");
    }

    const result = await get_all_candidates_action({limit: 0, offset: 0});
    const candidate = Array.isArray(result) ? result[1] : [];
    const stagesCount = await get_candidates_stage_count_action();

    return (
        <PluginProvider orgId={orgId}>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "350px",
                    } as React.CSSProperties
                }>
                <AppSidebar candidate={candidate as CandidatesResponseType[]}
                            stagescount={stagesCount as StageCountType[]}/>
                <SidebarInset>
                    <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                        <SidebarTrigger className="-ml-1"/>
                        <Separator orientation="vertical" className="mr-2 h-4"/>
                        <OrganizationSwitcher/>
                        <Separator orientation="vertical" className="mr-2 h-4"/>
                        <div className="ml-auto flex items-center gap-4">
                            <Button className="p-0">
                                <Link href="/jobs/new" className="flex items-center gap-2 w-full h-full px-4 py-1.5">
                                    <Plus size={20}/>
                                    <p>Create New Job</p>
                                </Link>
                            </Button>

                            <Bell size={18}/>

                            <div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="flex items-center gap-2.5">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src="https://github.com/shadcn.png"/>
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>

                                        <div className="flex items-center text-slate-500">
                                            <p className="text-sm ">{user?.firstName} {user?.lastName?.slice(0, 1)}.</p>
                                            <ChevronDown size={20}/>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>
                                            <LogOut/>
                                            <span>Log out</span>
                                            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                            </div>
                        </div>
                    </header>
                    <>
                        <NewJobContextProvider>
                            {children}
                        </NewJobContextProvider>
                    </>
                </SidebarInset>
            </SidebarProvider>
        </PluginProvider>
    )
}

export default Layout;
