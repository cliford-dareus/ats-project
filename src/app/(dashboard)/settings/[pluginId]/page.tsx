import { auth } from "@clerk/nextjs/server";
import PluginConfigClient from "./_components/provider-config-client";
import { getOrgPluginState } from "@/server/actions/plugin-actions";
import { get_organization_plugins } from "@/server/actions/organization_actions";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import { ReactivateButton } from "../_components/installed-extentions";
import { hasPermission } from "@/server/permissions";

type Props = {
    params: Promise<{ pluginId: string }>;
};

const ProviderConfig = async ({ params }: Props) => {
    const { pluginId } = await params;
    const { orgId } = await auth();
    if (!orgId) {
        return
    }

    // Plugin settings expose masked keys (last 4), flags and full plugin
    // config (company name, hiring-manager/recruiter emails, From
    // address) — admin-only, like the mutations. The settings layout
    // has no role gating, and no read-specific plugin permission exists
    // in the permission map, so plugin:manage is the gate. (This check
    // gives non-admins a clear denial instead of the AuthzError
    // getOrgPluginState itself would throw below.)
    if (!(await hasPermission("plugin:manage"))) {
        return (
            <div>
                <h1>Provider Configuration</h1>
                <p>You don&apos;t have permission to manage plugins. Ask an organization admin.</p>
            </div>
        );
    }

    const { flags, installed } = await getOrgPluginState(orgId)
    const available = installed.find(p => p.id === pluginId);
    if (!available || !flags[pluginId]) {
        // Distinguish a disabled plugin from an unknown id: a disabled
        // plugin still has a settings row and an `enabled` entry (only
        // `active` is false), while a typo'd id has neither. The raw
        // record is masked and plugin:manage-gated, like this page.
        const manifest = AVAILABLE_PLUGINS.find((p) => p.id === pluginId);
        const record = await get_organization_plugins();
        const isDisabled =
            Boolean(manifest?.hasProvider) &&
            record.enabled?.includes(pluginId) &&
            Boolean(record.settings?.[pluginId]);
        if (isDisabled && manifest) {
            return (
                <div>
                    <h1>Provider Configuration</h1>
                    <p>This plugin is disabled — its settings are kept, but it won&apos;t run until you reactivate it.</p>
                    <div className="mt-4">
                        <ReactivateButton
                            plugin={{ ...manifest, settings: record.settings[pluginId] }}
                            orgId={orgId}
                        />
                    </div>
                </div>
            );
        }
        return (
            <div>
                <h1>Provider Configuration</h1>
                <p>Plugin not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-6">
            <PluginConfigClient
                plugin={available}
                organizationId={orgId}
                initialSettings={available.settings ?? {}}
            />
        </div>
    );
};

export default ProviderConfig;
