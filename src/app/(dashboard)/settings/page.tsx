import { auth } from "@clerk/nextjs/server";

import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import { get_extensions_installed } from "@/lib/plugins-registry";
import InstalledExtensions from "./_components/installed-extentions";
import AvailableExtensions from "./_components/available-extentions";


const Page = async () => {
    const { orgId } = await auth();
    if (!orgId) return null;

    const installed = await get_extensions_installed(orgId);
    const available = AVAILABLE_PLUGINS.filter((plugin) => !installed?.some((p) => p.id === plugin.id));
    
    console.log("installed", installed, "available", available);

    return (
        <div className="space-y-12">
            <InstalledExtensions installed={installed!} orgId={orgId} />
            <AvailableExtensions available={available} orgId={orgId} />
        </div>
    );
};

export default Page;
