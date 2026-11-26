import { SidebarProvider } from "@/components/ui/sidebar";
import { NewJobContextProvider } from "./new-job-provider";
import { PluginSystemProvider } from "./plugin-system-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { getOrgPluginFlags, getOrgPluginState } from "@/server/actions/plugin-actions";
import { hasPermission } from "@/server/permissions";

type Props = {
    children: React.ReactNode;
    orgId: string;
};

const Provider = async ({ children, orgId }: Props) => {
    // Feature flags are non-sensitive booleans — every role gets them,
    // from the dedicated flags-only action (no keys, config, or emails).
    const flags = await getOrgPluginFlags();
    // Installed-plugin details (masked keys, config) are admin-only and
    // seed the client registry the settings config UI reads
    // (useProviderAuthState / useAuthenticateProvider). Non-managers get
    // an empty list; the provider's feature gating uses flags only.
    const installed = (await hasPermission("plugin:manage"))
        ? (await getOrgPluginState(orgId)).installed
        : [];
    return (
        <PluginSystemProvider flags={flags} installed={installed}>
            <SocketProvider>
                <NewJobContextProvider>
                    <SidebarProvider
                        style={
                            {
                                "--sidebar-width": "350px",
                            } as React.CSSProperties
                        }
                    >
                        {children}
                    </SidebarProvider>
                </NewJobContextProvider>
            </SocketProvider>
        </PluginSystemProvider>
    );
};

export default Provider;
