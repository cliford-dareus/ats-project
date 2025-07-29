import { PluginConfig } from "@/lib/plugins-registry";


const pluginConfig = {
    id: "external-job-board",
    name: "External Job Board",
    description: "Automate recruitment workflows with triggers.",
    version: "1.0.0",
    component: SmartTriggers,
    settingsComponent: SmartTriggers,
    activate: lifecycle.activate,
    deactivate: lifecycle.deactivate,
    defaultConfig: {
        triggers: DEFAULT_TRIGGERS,
    },
} as PluginConfig;

export default pluginConfig;
