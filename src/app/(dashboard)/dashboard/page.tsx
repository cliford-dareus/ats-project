import DashboardLayout from "@/app/(dashboard)/dashboard/_components/dashboard-layout";
import {auth} from "@clerk/nextjs/server";

const Page = async () => {
    const {orgId} = await auth();
    if (!orgId) return null;

    return (
        <DashboardLayout organization={orgId as string}/>
    )
};

export default Page;