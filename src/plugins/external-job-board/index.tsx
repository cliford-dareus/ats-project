import { PluginConfig } from "@/lib/plugins-registry";
import { lifecycle } from "./lifecycle";


const ExternalJobBoard = () => {
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">External Job Board</h2>
            <p className="text-gray-600 mb-6">
                Automate your recruitment workflows with Smart Triggers.
            </p>
        </div>
    );
};

const pluginConfig = {
    id: "external-job-board",
    name: "External Job Board",
    description: "Automate recruitment workflows with revalidate-db-cache.",
    version: "1.0.0",
    component: ExternalJobBoard,
    settingsComponent: ExternalJobBoard,
    actions: lifecycle,
    // activate: activate,
    // deactivate: deactivate,
    defaultConfig: {
        externalJobBoards: [],
    },
} as PluginConfig;

export default pluginConfig;
