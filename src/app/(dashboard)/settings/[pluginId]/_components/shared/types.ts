import { OrgPluginSettings } from "@/types";

export type ConfigProps = {
    pluginId: string;
    onSave: (settings: any) => void;
    settings: OrgPluginSettings;
};
