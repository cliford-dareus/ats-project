'use client'

import {usePlugin} from "@/providers/plugins-provider";

export default function SmartTriggersFeature() {
    const { isPluginActive, activePlugins } = usePlugin();

    if (!isPluginActive('smart-trigger')) return null;

    return (
        <div className="p-4 rounded shadow">
            <h2>Smart Triggers</h2>
            {/* Trigger configuration UI */}
        </div>
    );
}
