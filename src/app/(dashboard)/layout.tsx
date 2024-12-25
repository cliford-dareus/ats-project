import AuthOrgProvider from "@/providers/auth-org-provider";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React from "react";

type Props = {
    children: React.ReactNode
}

const Layout = ({children}: Props) => {
    return (
        <SidebarProvider
            style={
            {
                "--sidebar-width": "350px",
            } as React.CSSProperties
        }>
            <AppSidebar />
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
                <div className="min-h-screen flex flex-col justify-center items-center ">
                    {children}
                </div>
            </SidebarInset>

        </SidebarProvider>

    )
}

export default Layout;