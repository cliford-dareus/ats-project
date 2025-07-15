"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { PluginsProvider } from "./plugins-provider";
import { NewJobContextProvider } from "./new-job-provider";
import { fetchPlugins, getPlugins, registerPlugin } from "@/lib/plugins-registry";
import { useEffect } from "react";

import SmartTriggers from "@/plugins/smart-trigger/index";
import TinyBird from "@/plugins/analytics/index"

type Props = {
  children: React.ReactNode;
  orgId: string;
};

registerPlugin(SmartTriggers);
registerPlugin(TinyBird);

const Provider = ({ children, orgId }: Props) => {
    useEffect(() => {
        fetchPlugins(orgId);
    }, []);

  return (
    <PluginsProvider>
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
    </PluginsProvider>
  );
};

export default Provider;
