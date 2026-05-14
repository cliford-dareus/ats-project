import { SidebarProvider } from "@/components/ui/sidebar";
import { NewJobContextProvider } from "./new-job-provider";
import { PluginSystemProvider } from "./plugin-system-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { getOrgPluginState } from "@/server/actions/stage_actions";

type Props = {
    children: React.ReactNode;
    orgId: string;
};

const Provider = async ({ children, orgId }: Props) => {
    const { flags, installed } = await getOrgPluginState(orgId);
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
