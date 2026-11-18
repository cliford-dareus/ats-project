import { OrgPluginSettings } from "@/types";

export type ConfigProps = {
    pluginId: string;
    // Persists the full plugin settings for the session org (server action).
    // Await it — callers show their own saving/saved state around it.
    onSave: (settings: OrgPluginSettings) => Promise<void>;
    settings: OrgPluginSettings;
};

/**
 * Display-only masking for a credential value already in the browser
 * (`••••` + last 4). Server-sent values arrive masked already; this only
 * covers the brief window where the value is a key the user just typed.
 * This is NOT a security boundary — real masking happens server-side
 * (src/lib/plugin-encryption.ts) before anything reaches the client.
 */
export const mask_key_for_display = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    if (value.startsWith("••••")) return value;
    if (value.length <= 4) return "••••••••";
    return `••••${value.slice(-4)}`;
};
