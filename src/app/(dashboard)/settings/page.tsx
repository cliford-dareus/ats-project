import { auth } from "@clerk/nextjs/server";
import InstalledExtensions from "./_components/installed-extentions";
import AvailableExtensions from "./_components/available-extentions";
import { getInstalledPlugins } from "@/server/actions/stage_actions";


const Page = async () => {
    const { orgId } = await auth();
    if (!orgId) return null;
    
    const installed = await getInstalledPlugins(orgId);
    
    return (
        <div className="space-y-12">
            <InstalledExtensions installed={installed} orgId={orgId} />
            <AvailableExtensions orgId={orgId} installed={installed} />
        </div>
    );
};

export default Page;
