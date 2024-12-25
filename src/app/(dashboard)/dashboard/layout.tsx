import AuthOrgProvider from "@/providers/auth-org-provider";
import React from "react";

type Props = {
    children: React.ReactNode
}

const DashboardLayout = async ({children}: Props) => {
    return (
        <AuthOrgProvider>
            <div className="">
                {children}
            </div>
        </AuthOrgProvider>
    )
}

export default DashboardLayout;