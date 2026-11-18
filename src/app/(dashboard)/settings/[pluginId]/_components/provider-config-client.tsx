'use client';

import { useState } from 'react';
import ResendConfig from './resend-config';
import GoogleConfig from './google-config';
import { InstalledPlugin, OrgPluginSettings } from '@/types';
import { update_organization_plugins_action } from "@/server/actions/organization_actions";

type Props = {
    plugin: InstalledPlugin;
    organizationId: string;
    initialSettings: OrgPluginSettings;
};

export default function PluginConfigClient({
    plugin,
    organizationId,
    initialSettings
}: Props) {
    const [settings, setSettings] = useState(initialSettings);
    const [, setSaving] = useState(false);

    const handleSave = async (newSettings: OrgPluginSettings) => {
        setSaving(true);
        try {
            // Real persistence — scoped to the session org server-side
            // (the orgId argument is ignored there; kept for call-site compatibility).
            // The server encrypts new credentials on save and returns the
            // saved settings with credentials MASKED — adopt those, so a
            // just-typed key never lingers in client state.
            const result = await update_organization_plugins_action(organizationId, newSettings, plugin.id);
            if (result && typeof result === "object" && "error" in result && result.error) {
                throw new Error(String(result.error));
            }
            if (result && typeof result === "object" && "settings" in result && result.settings) {
                setSettings(result.settings as OrgPluginSettings);
            } else {
                // Unexpected shape — keep the previously stored (masked)
                // credentials rather than the plaintext key just sent.
                setSettings({ ...newSettings, credentials: settings.credentials });
            }
        } catch (err) {
            console.error(err);
            alert("Failed to save settings");
            throw err;
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
