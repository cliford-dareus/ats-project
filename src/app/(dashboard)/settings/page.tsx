import { auth } from "@clerk/nextjs/server";
import InstalledExtensions, { InactiveExtensions } from "./_components/installed-extentions";
import AvailableExtensions from "./_components/available-extentions";
import { getInstalledPlugins } from "@/server/actions/stage_actions";
import { get_organization_plugins } from "@/server/actions/organization_actions";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import { InstalledPlugin } from "@/types";
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

    // Deactivated plugins are omitted from `installed` by
    // build_org_plugin_state (enabled && active only), so without this
    // they vanished from Active Extensions and reappeared under
    // Recommended with an Install button. A plugin is inactive-installed
    // when it is still in the org's `enabled` list (deactivation only
    // flips `active` — uninstall removes the `enabled` entry AND clears
    // credentials, so uninstalled plugins correctly stay Recommended).
    // The raw record is masked (•••• + last 4) and plugin:manage-gated.
    const record = await get_organization_plugins();
    const inactiveInstalled: InstalledPlugin[] = AVAILABLE_PLUGINS
        .filter((manifest) => manifest.hasProvider)
        .filter((manifest) =>
            record.enabled?.includes(manifest.id) &&
            record.settings?.[manifest.id]?.active !== true,
        )
        .map((manifest) => ({
            ...manifest,
            settings: record.settings?.[manifest.id] ?? { active: false },
        }));

    return (
        <div className="space-y-12">
            <InstalledExtensions installed={installed} orgId={orgId} />
            <InactiveExtensions installed={inactiveInstalled} orgId={orgId} />
            {/* Inactive plugins are installed, not available — pass them
                along so they don't reappear under Recommended. */}
            <AvailableExtensions orgId={orgId} installed={[...installed, ...inactiveInstalled]} />
        </div>
    );
};

export default Page;
