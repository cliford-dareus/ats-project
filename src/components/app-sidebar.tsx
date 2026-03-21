"use client"

import {
    Sidebar,
    SidebarContent, SidebarFooter,
    SidebarGroup, SidebarGroupContent,
    SidebarHeader, SidebarInput,
    SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, useSidebar
} from "@/components/ui/sidebar"
import {
    Command,
    Trash2,
    LucideLayoutDashboard,
    FileUser,
    BriefcaseBusiness,
    Users, Settings,
    FileText
} from "lucide-react";
import React, {useEffect} from "react";
import {usePathname, useRouter} from "next/navigation";
import SidebarSettings from "@/app/(dashboard)/settings/_components/sidebar-settings";
import JobListingSidebar from "@/app/(dashboard)/jobs/_components/job-listing-sidebar";
import CandidatesSidebar from "@/app/(dashboard)/candidates/_components/candidates-sidebar";
import ReportsSidebar from "@/app/(dashboard)/reports/_components/reports-sidebar";
import TrashSidebar from "@/app/(dashboard)/trash/_components/trash-sidebar";
import {CandidatesResponseType} from "@/types";
import {StageCountType} from "@/app/(dashboard)/layout";
import StepNavigation from "@/app/(dashboard)/jobs/new/_component/side-navigation";
import SidebarDashboard from "@/app/(dashboard)/dashboard/_components/sidebar-dashboard";
import ApplicationsSidebar from "@/app/(dashboard)/applications/_components/application-sidebar";

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/",
            icon: LucideLayoutDashboard,
            isActive: true,
        },
        {
            title: "Jobs",
            url: "/jobs",
            icon: BriefcaseBusiness,
            isActive: false,
        },
        {
            title: "Applications",
            url: "/applications",
            icon: FileUser,
            isActive: false,
        },
        {
            title: "Candidates",
            url: "/candidates",
            icon: Users,
            isActive: false,
        },
        {
            title: "Reports",
            url: "/reports",
            icon: FileText,
            isActive: false,
        },
        {
            title: "Settings",
            url: "/settings",
            icon: Settings,
            isActive: false,
        },
        {
            title: "Trash",
            url: "/trash",
            icon: Trash2,
            isActive: false,
        },
    ]
};

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const {setOpen} = useSidebar();
    const router = useRouter();

    const activeItem = data.navMain.find(nav =>
        nav.url === "/" ? pathname === "/" : pathname.startsWith(nav.url)
    ) || data.navMain[0];


    return (
        <Sidebar
            variant="floating"
            collapsible="icon"
            className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
            {...props}
        >
            <Sidebar
                collapsible="none"
                className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
            >
                {/* LOGO */}
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenu className="md:h-8 md:p-0">
                                <a href="#">
                                    <div
                                        className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                        <Command className="size-4"/>
                                    </div>
                                </a>
                            </SidebarMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent className="px-1.5 md:px-0">
                            <SidebarMenu>
                                {data.navMain.map((item) => (
                                    <SidebarMenuItem key={item.url}>
                                        <SidebarMenuButton
                                            tooltip={{
                                                children: item.title,
                                                hidden: false,
                                            }}
                                            onClick={() => {
                                                router.push(`${item.url}`)
                                                // setActiveItem(item)
                                                setOpen(true)
                                            }}
                                            isActive={activeItem.title === item.title}
                                            className="px-2.5 md:px-2"
                                        >
                                            <item.icon/>
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    {/*<NavUser user={data.user} />*/}
                </SidebarFooter>
            </Sidebar>

            {/* FILTER / NAV */}
            <Sidebar collapsible="none" className="hidden flex-1 md:flex">
                <SidebarHeader className="gap-3.5 border-b p-4">
                    <div className="flex w-full items-center justify-between">
                        <div className="text-base font-medium text-foreground">
                            {activeItem.title}
                        </div>
                    </div>
                    {activeItem.title !== "Settings" && <SidebarInput placeholder="Type to search..."/>}
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup className="px-0">
                        <SidebarGroupContent>
                            {activeItem.title === "Dashboard" ? (
                                <SidebarDashboard/>
                            ) : activeItem.title === "Jobs" && !pathname.startsWith('/jobs/new/step') ? (
                                <JobListingSidebar/>
                            ) : activeItem.title === "Applications" ? (
                                <ApplicationsSidebar />
                            ) : activeItem.title === "Candidates" ? (
                                <CandidatesSidebar/>
                            ) : activeItem.title === "Reports" ? (
                                <ReportsSidebar/>
                            ) : activeItem.title === "Trash" ? (
                                <TrashSidebar/>
                            ) : activeItem.title === "Settings" ? (
                                <SidebarSettings/>
                            ) : pathname.startsWith("/jobs/new/step") ? (
                                <StepNavigation/>
                            ) : (
                                <div className="px-4">Default</div>
                            )}
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </Sidebar>
    )
};
