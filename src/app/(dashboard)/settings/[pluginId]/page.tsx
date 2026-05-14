import { auth } from "@clerk/nextjs/server";
import PluginConfigClient from "./_components/provider-config-client";
import { getOrgPluginState } from "@/server/actions/stage_actions";

type Props = {
    params: Promise<{ pluginId: string }>;
};

const ProviderConfig = async ({ params }: Props) => {
    const { pluginId } = await params;
    const { orgId } = await auth();
    if (!orgId) {
        return
    }
    
    const { flags, installed } = await getOrgPluginState(orgId)
    const available = installed.find(p => p.id === pluginId);
    if (!available || !flags[pluginId]) {
        return (
            <div>
                <h1>Provider Configuration</h1>
                <p>Plugin not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <PluginConfigClient
                plugin={available}
                organizationId={orgId}
                initialSettings={available.settings ?? {}}
            />
        </div>
    );
};

export default ProviderConfig;
