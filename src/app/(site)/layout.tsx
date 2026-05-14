import { currentUser, auth } from "@clerk/nextjs/server";
import Header from "./_components/header";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: React.ReactNode }) => {
    // Cache the user object to avoid unnecessary re-fetches
    const user = await currentUser();
    const { orgId,  } = await auth();
    
    if(user && orgId) {
        redirect("/dashboard")
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header user={user} orgId={orgId!} />
            <main className="flex-1">{children}</main>
            {/* <Footer /> */}
        </div>
    );
};

export default Layout;
