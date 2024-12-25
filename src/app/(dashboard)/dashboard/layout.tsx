import {auth, currentUser} from "@clerk/nextjs/server";
import AuthOrgProvider from "@/providers/auth-org-provider";

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