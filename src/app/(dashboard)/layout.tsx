import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React from "react";
import {get_all_candidates_action} from "@/server/actions/candidates-actions";
import {candidatesResponseType} from "@/types/job-listings-types";

type Props = {
    children: React.ReactNode
}

const Layout = async ({children}: Props) => {
    const candidate = await get_all_candidates_action();

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "350px",
                } as React.CSSProperties
            }>
            <AppSidebar candidate={candidate as candidatesResponseType[]} />
            <SidebarInset>
                <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                    <SidebarTrigger className="-ml-1"/>
                    {/*<Separator orientation="vertical" className="mr-2 h-4" />*/}
                    {/*<Breadcrumb>*/}
                    {/*    <BreadcrumbList>*/}
                    {/*        <BreadcrumbItem className="hidden md:block">*/}
                    {/*            <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>*/}
                    {/*        </BreadcrumbItem>*/}
                    {/*        <BreadcrumbSeparator className="hidden md:block" />*/}
                    {/*        <BreadcrumbItem>*/}
                    {/*            <BreadcrumbPage>Inbox</BreadcrumbPage>*/}
                    {/*        </BreadcrumbItem>*/}
                    {/*    </BreadcrumbList>*/}
                    {/*</Breadcrumb>*/}
                </header>
                <>
                    {children}
                </>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;