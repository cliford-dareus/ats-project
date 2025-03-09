'use client'

import {useEffect, useState} from 'react';
import {getPlugins} from "@/lib/plugins-registry";

export default function PluginManager({orgId}: { orgId: string }) {
    const [activePlugins, setActivePlugins] = useState<string[]>([]);
    const allPlugins = getPlugins();

    useEffect(() => {
        fetch(`/api/plugins?orgId=${orgId}`)
            .then(res => res.json())
            .then(data => setActivePlugins(data.enabled));
    }, [orgId]);

    const togglePlugin = async (pluginId: string) => {
        const newEnabled = activePlugins.includes(pluginId)
            ? activePlugins.filter(id => id !== pluginId)
            : [...activePlugins, pluginId];

        await fetch(`/api/plugins?orgId=${orgId}`, {
            method: 'PATCH',
            body: JSON.stringify({enabledPlugins: newEnabled})
        });

        setActivePlugins(newEnabled);
    };

    return (
        <div className="space-y-4">
            {allPlugins.map(plugin => (
                <div key={plugin.id} className="p-4 border rounded">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">{plugin.name}</h3>
                            <p className="text-gray-600">{plugin.description}</p>
                        </div>
                        <button
                            onClick={() => togglePlugin(plugin.id)}
                            className={`px-4 py-2 rounded ${
                                activePlugins.includes(plugin.id)
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-green-500 hover:bg-green-600'
                            } text-white`}
                        >
                            {activePlugins.includes(plugin.id) ? 'Disable' : 'Enable'}
                        </button>
                    </div>
                    {activePlugins.includes(plugin.id) && plugin.settingsComponent && (
                        <div className="mt-4">
                            {/*<plugin.settingsComponent userId={userId} />*/}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
