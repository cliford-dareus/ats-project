'use client';

import { useState } from 'react';
import ResendConfig from './resend-config';
import GoogleConfig from './google-config';
import { InstalledPlugin, OrgPluginSettings } from '@/types';

type Props = {
    plugin: InstalledPlugin;
    organizationId: string;
    initialSettings: OrgPluginSettings;
};

export default function PluginConfigClient({
    plugin,
    // organizationId,
    initialSettings
}: Props) {
    const [settings, setSettings] = useState(initialSettings);
    const [, setSaving] = useState(false);

    const handleSave = async (newSettings: OrgPluginSettings) => {
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
                <p className="text-muted-foreground">{plugin.description}</p>
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
