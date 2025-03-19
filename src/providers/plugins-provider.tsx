"use client";

import {createContext, useContext, useEffect, useState} from "react";
import SmartTriggers from "@/plugins/smart-trigger/index";
import { registerPlugin } from "@/lib/plugins-registry";

type Props = {
  orgId: string;
  children: React.ReactNode;
};

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

registerPlugin(SmartTriggers);

export const PluginProvider = ({ children, orgId }: Props) => {
  const [activePlugins, setActivePlugins] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlugins = async () => {
      const data = await fetch(`/api/plugins/?orgId=${orgId}`);
      if (!data.ok) {
        setActivePlugins([]);
        return;
      }
      const json = await data.json();
      setActivePlugins(json.enabled);
    };

    fetchPlugins();
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
