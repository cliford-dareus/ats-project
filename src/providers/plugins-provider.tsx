"use client";

import { createContext, useContext, useEffect, useState } from "react";

type PluginContextType = {
  activePlugins: string[];
  setActivePlugins: (plugins: string[]) => void;
  isPluginActive: (pluginId: string) => boolean;
};

const PluginContext = createContext<PluginContextType>({
  activePlugins: [],
  setActivePlugins: () => {},
  isPluginActive: () => false,
});

type Props = {
  orgId: string;
  children: React.ReactNode;
};

import SmartTriggers from "@/plugins/smart-trigger/index";
// import Analytics from '@/plugins/analytics/index';
import { registerPlugin } from "@/lib/plugins-registry";

// Register all modules here
registerPlugin(SmartTriggers);
// moduleRegistry.register(Analytics);

export const PluginProvider = ({ children, orgId }: Props) => {
  const [activePlugins, setActivePlugins] = useState<string[]>([]);

  useEffect(() => {
    const f = async () => {
      const data = await fetch(`/api/plugins/?orgId=${orgId}`);
      const json = await data.json();
      setActivePlugins(json.enabled);
    };

    f();
  }, [orgId]);

  return (
    <PluginContext.Provider
      value={{
        activePlugins,
        setActivePlugins,
        isPluginActive: (pluginId) => activePlugins.includes(pluginId),
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugin = () => useContext(PluginContext);
