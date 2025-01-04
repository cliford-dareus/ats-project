import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar";
import {AppSidebar} from "@/components/app-sidebar";
import React from "react";
import {get_all_candidates_action, get_candidates_stage_count_action} from "@/server/actions/candidates-actions";
import {candidatesResponseType} from "@/types/job-listings-types";
import {Separator} from "@/components/ui/separator";

type Props = {
    children: React.ReactNode
}

export type StageCountType = {
    stageId: number
    stages: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null
    count: number
}

const Layout = async ({children}: Props) => {
    const candidate = await get_all_candidates_action();
    const stagescount = await get_candidates_stage_count_action();

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "350px",
                } as React.CSSProperties
            }>
            <AppSidebar candidate={candidate as candidatesResponseType[]}
                        stagescount={stagescount as StageCountType[]}/>
            <SidebarInset>
                <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                    <SidebarTrigger className="-ml-1"/>
                    <Separator orientation="vertical" className="mr-2 h-4"/>
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

                    {/*
                        TODO: Create the breadcrumb with params
                        TODO: Add current user avatar with roles
                     */}
                    <div className="ml-auto">user avatar</div>
                </header>
                <>
                    {children}
                </>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;