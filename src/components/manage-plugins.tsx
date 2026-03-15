"use client";

import {useEffect, useState} from "react";
import {useServerFlags} from "@/lib/plugins-registry";

export default function PluginManager({orgId}: { orgId: string }) {
    const [activeFlags, setActiveFlags] = useState<string[]>([])
    // const [plugins, setPlugings] = useState()

    useEffect(() => {
        const fetchPlugings = async () => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const flags = await useServerFlags(orgId)
            const active = Object.keys(flags);
            setActiveFlags(active)
        }
        fetchPlugings();
    }, [orgId]);

    // const handleToggle = async (pluginId: string, enabled: boolean) => {
    //     await togglePlugin(pluginId, enabled, orgId);
    //     const plugin = plugins.find((p) => p.id === pluginId);
    //     if (plugin) {
    //         if (enabled && plugin.config.activate) {
    //             plugin.config.activate(context);
    //         } else if (!enabled && plugin.config.deactivate) {
    //             plugin.config.deactivate(context);
    //         }
    //     }
    //     setPlugins(getPlugins());
    // };

    return (
        <div className="space-y-4">
            {activeFlags.map((plugin, index) => (
                <div key={index} className="p-4 border rounded">
                    <div className="flex items-center gap-4">
                        <input
                            type="checkbox"
                            checked={true}
                            // onChange={(e) => handleToggle(plugin.id, e.target.checked)}
                        />
                        <div>
                            <h3 className="text-lg font-semibold">{plugin}</h3>
                            {/*<p className="text-gray-600">{plugin.config.description}</p>*/}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
