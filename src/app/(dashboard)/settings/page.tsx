import { auth } from "@clerk/nextjs/server";
import InstalledExtensions from "./_components/installed-extentions";
import AvailableExtensions from "./_components/available-extentions";
import { getInstalledPlugins } from "@/server/actions/stage_actions";
import { hasPermission } from "@/server/permissions";


const Page = async () => {
    const { orgId } = await auth();
    if (!orgId) return null;

    // This page is the plugin/extensions manager (install, uninstall,
    // configure) — admin-only, like the [pluginId] config page. Without
    // the gate, non-admins saw an empty list plus Install buttons that
    // fail with an auth error.
    if (!(await hasPermission("plugin:manage"))) {
        return (
            <div>
                <h1>Extensions</h1>
                <p>You don&apos;t have permission to manage plugins. Ask an organization admin.</p>
            </div>
        );
    }

    const installed = await getInstalledPlugins(orgId);
    
    return (
        <div className="space-y-12">
            <InstalledExtensions installed={installed} orgId={orgId} />
            <AvailableExtensions orgId={orgId} installed={installed} />
        </div>
    );
};

export default Page;
