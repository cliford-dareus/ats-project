"use client";

import { PluginIcon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import { toggle_organization_plugin_action } from "@/server/actions/organization_actions";
import { ExternalLink } from "lucide-react";
import { useTransition } from "react";

const AvailableExtensions = ({ available, orgId }: { available: typeof AVAILABLE_PLUGINS; orgId: string }) => {
    const [, startTransition] = useTransition();

    const onInstall = async (pluginId: string) => {
        startTransition(async () => {
            const pluginConfig = available.find((plugin) => plugin.id === pluginId)?.config
            await toggle_organization_plugin_action(orgId, true, pluginId, pluginConfig)
        });
    };

    return (
        <div className="space-y-6 px-4">
            <div className="space-y-1 border-t border-zinc-100 pt-12">
                <h3 className="font-bold text-zinc-900">Recommended Extensions</h3>
                <p className="text-xs text-zinc-500">Discovery tools to boost your recruitment pipeline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {available.map((plugin) => (
                    <div key={plugin.id} className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100 transition-all hover:bg-white hover:border-zinc-200 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", plugin.bg)}>
                                <PluginIcon name={plugin.id} className={cn("w-6 h-6", plugin.color)} />
                            </div>
                            <button
                                onClick={() => onInstall(plugin.id)}
                                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                            >
                                Install
                            </button>
                        </div>
                        <h4 className="font-bold text-zinc-900">{plugin.name}</h4>
                        <p className="text-xs text-zinc-400 font-medium">by {plugin.provider}</p>
                        <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
                            {plugin.desc}
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 group-hover:text-zinc-600">
                                <ExternalLink
                                    className="w-3 h-3" /> Learn more
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AvailableExtensions;
