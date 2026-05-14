'use client';

import { useState } from 'react';
// import { updatePluginSettings } from '@/server/actions/plugin-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResendConfig from './resend-config';

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
                <h1 className="text-3xl font-bold">{plugin.name} Configuration</h1>
                <p className="text-muted-foreground">{plugin.desc}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Plugin Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Example: Different settings based on plugin */}
                    {plugin.id === 'resend' && (
                        <ResendConfig
                            settings={settings}
                            onSave={handleSave}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
