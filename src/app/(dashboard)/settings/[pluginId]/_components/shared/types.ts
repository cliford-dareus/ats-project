import { OrgPluginSettings } from "@/types";

export type ConfigProps = {
    pluginId: string;
    onSave: (settings: OrgPluginSettings) => void;
    settings: OrgPluginSettings;
};
