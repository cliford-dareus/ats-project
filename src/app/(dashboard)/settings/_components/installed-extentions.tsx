"use client";

import { PluginIcon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { toggle_organization_plugin_action, update_organization_plugins_action } from "@/server/actions/organization_actions";
import { InstalledPlugin } from "@/types";
import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ProviderBadge } from "./provider-badge";

type InstalledExtensionsProps = {
    orgId: string;
    installed: InstalledPlugin[];
};

const InstalledExtensions = ({ installed, orgId }: InstalledExtensionsProps) => {
     const router = useRouter();
    const [isPending, startTransition] = useTransition();


    const onToggleActive = async (plugin: InstalledPlugin, nextActive: boolean) => {
        startTransition(async () => {
            try {
                // Flip only the active flag — merge with the stored settings so
                // credentials/config are preserved (passing a bare boolean here
                // used to replace the whole settings object).
                await update_organization_plugins_action(orgId, { ...plugin.settings, active: nextActive }, plugin.id);
                router.refresh();
            } catch (error) {
                console.error("Failed to toggle plugin status", error);
            }
        });
    };

    const onUninstall = async (pluginId: string) => {
        if (!confirm("Are you sure you want to uninstall this extension?")) return;

        startTransition(async () => {
            try {
                // Assuming false removes it or deactivates it based on your backend logic
                await toggle_organization_plugin_action(orgId, false, pluginId);
                router.refresh();
            } catch (error) {
                console.error("Failed to uninstall plugin", error);
            }
        });
    };

    return (
        <div className="space-y-6 px-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-bold text-foreground">Active Extensions</h3>
                    <p className="text-xs text-muted-foreground">Manage your connected applications and tools.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {installed.map((plugin) => (
                    <div key={plugin.id} className={cn(
                        "bg-card p-6 rounded-2xl border transition-all group relative",
                        plugin.settings.active ? "border-border shadow-sm" : "border-border opacity-75 grayscale-[0.5]"
                    )}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative", plugin.providerColor)}>
                                <PluginIcon name={plugin.id} className={cn("w-6 h-6")} />
                                {plugin.settings.active && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onToggleActive(plugin, !plugin.settings.active)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        plugin.settings.active ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                                    )}
                                    title={plugin.settings.active ? "Deactivate" : "Activate"}
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Power className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground">{plugin.name}</h4>
                            {plugin.id === 'gemini' && (
                                <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[8px] font-bold uppercase rounded leading-none">Pro</span>
                            )}
                        </div>
                        {/*<p className="text-xs text-muted-foreground font-medium">by {plugin.provider}</p>*/}
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed min-h-[40px]">
                            {plugin.description}
                        </p>

                        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/settings/${plugin.id}`)}
                                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                    Settings
                                </button>
                                <div className="w-1 h-1 bg-muted rounded-full" />
                                <button
                                    onClick={() => onUninstall(plugin.id)}
                                    className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                                >
                                    Uninstall
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <ProviderBadge providerId={plugin.id} />
                            </div>
                        </div>
                    </div>
                )
                )}
            </div>
        </div>
    );
};

export default InstalledExtensions;
