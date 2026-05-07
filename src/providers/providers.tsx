import {SidebarProvider} from "@/components/ui/sidebar";
import {NewJobContextProvider} from "./new-job-provider";
import {PluginProvider} from "@/providers/plugin-provider";
import {useServerFlags} from "@/lib/plugins-registry";
import {SocketProvider} from "@/providers/socket-provider";

type Props = {
    children: React.ReactNode;
    orgId: string;
};

const Provider = async ({children, orgId}: Props) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const flags = await useServerFlags(orgId);
    const initialPlugins = Object.keys(flags);
    return (
        <SocketProvider>
            <NewJobContextProvider>
                <PluginProvider initialPlugins={initialPlugins}>
                    <SidebarProvider
                        style={
                            {
                                "--sidebar-width": "350px",
                            } as React.CSSProperties
                        }
                    >
                        {children}
                    </SidebarProvider>
                </PluginProvider>
            </NewJobContextProvider>
        </SocketProvider>
    );
};

export default Provider;
