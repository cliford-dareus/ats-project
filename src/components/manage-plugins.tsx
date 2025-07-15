"use client";

import { fetchPlugins, getPlugins, togglePlugin } from "@/lib/plugins-registry";
import { usePluginContextHook } from "@/providers/plugins-provider";
import { useEffect, useState } from "react";

export default function PluginManager({ orgId }: { orgId: string }) {
    const context = usePluginContextHook();
    const [plugins, setPlugins] = useState(getPlugins());
    const allPlugins = getPlugins();

  useEffect(() => {
    // Fetch plugins on mount
    fetchPlugins(orgId).then(() => {
      setPlugins(getPlugins());
      // Activate enabled plugins
      getPlugins().forEach((plugin) => {
        if (plugin.enabled && plugin.config.activate) {
          plugin.config.activate(context);
        }
      });
    });
  }, [orgId]);

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    await togglePlugin(pluginId, enabled, orgId);
    const plugin = plugins.find((p) => p.id === pluginId);
    if (plugin) {
      if (enabled && plugin.config.activate) {
        plugin.config.activate(context);
      } else if (!enabled && plugin.config.deactivate) {
        plugin.config.deactivate(context);
      }
    }
    setPlugins(getPlugins());
  };

  return (
    <div className="space-y-4">
      {allPlugins.map((plugin) => (
        <div key={plugin.id} className="p-4 border rounded">
          <div className="flex items-center gap-4">
             <input
              type="checkbox"
              checked={plugin.enabled}
              onChange={(e) => handleToggle(plugin.id, e.target.checked)}
            />
            <div>
              <h3 className="text-lg font-semibold">{plugin.config.name}</h3>
              <p className="text-gray-600">{plugin.config.description}</p>
            </div>
          </div>
           {/* {plugin.enabled && plugin.config.component && (
            <div style={{ marginLeft: '20px' }}>
              <plugin.config.component
                config={plugin.userConfig}
                onConfigChange={(config) => updatePluginConfig(clerkId, plugin.id, config)}
              />
            </div>
          )} */}
        </div>
      ))}
    </div>
  );
}
