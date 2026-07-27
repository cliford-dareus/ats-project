'use client';

import { useState } from 'react';
import ResendConfig from './resend-config';
import GoogleConfig from './google-config';

type Props = {
    plugin: any;
    organizationId: string;
    initialSettings: any;
};

export default function PluginConfigClient({
    plugin,
    organizationId,
    initialSettings
}: Props) {
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);

    const handleSave = async (newSettings: any) => {
        setSaving(true);
        try {
            // await updatePluginSettings(organizationId, plugin.id, newSettings);
            setSettings(newSettings);
            alert("Settings saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold uppercase tracking-tight">{plugin.name} Configuration</h1>
                <p className="text-muted-foreground">{plugin.desc}</p>
            </div>

            {plugin.id === 'resend' && (
                <ResendConfig
                    pluginId={plugin.id}
                    settings={settings}
                    onSave={handleSave}
                />
            )}

            {plugin.id === 'google' && (
                <GoogleConfig
                    pluginId={plugin.id}
                    settings={settings}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};
