"use client"

import {
    Sidebar,
    SidebarContent, SidebarFooter,
    SidebarGroup, SidebarGroupContent,
    SidebarHeader, SidebarInput,
    SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, useSidebar
} from "@/components/ui/sidebar"
import {ArchiveX, Command, Send, Trash2, File, LucideLayoutDashboard} from "lucide-react";
import React, {useEffect} from "react";
import {usePathname, useRouter} from "next/navigation";
import SidebarSettings from "@/app/(dashboard)/settings/_components/sidebar-settings";
import JobListingSidebar from "@/app/(dashboard)/jobs/_components/job-listing-sidebar";
import SidebarCandidate from "@/app/(dashboard)/candidates/_components/sidebar-candidate";
import {candidatesResponseType } from "@/types/job-listings-types";

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LucideLayoutDashboard,
            isActive: true,
        },
        {
            title: "Jobs",
            url: "/jobs",
            icon: File,
            isActive: false,
        },
        {
            title: "Candidates",
            url: "/candidates",
            icon: Send,
            isActive: false,
        },
        {
            title: "Settings",
            url: "/settings",
            icon: ArchiveX,
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

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar> & {
    candidate: candidatesResponseType[]
}) {
    const pathname = usePathname()
    const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
    const {setOpen} = useSidebar()
    const router = useRouter()

    useEffect(() => {
        setActiveItem(data.navMain.find(nav => pathname.startsWith(nav.url))!)
    }, [pathname])

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
                                <h1>Dashboard</h1>
                            ) : activeItem.title === "Jobs" ? (
                                <JobListingSidebar/>
                            ) : activeItem.title === "Candidates" ? (
                                <SidebarCandidate candidate={props.candidate}/>
                            ) : activeItem.title === "Settings" ? (
                                <SidebarSettings/>
                            ) : null}
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </Sidebar>
    )
}
