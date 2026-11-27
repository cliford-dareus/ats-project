"use client";

import { PluginIcon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import { toggle_organization_plugin_action } from "@/server/actions/organization_actions";
import { InstalledPlugin } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const AvailableExtensions = ({ orgId, installed }: { orgId: string, installed: InstalledPlugin[] }) => {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ pluginId: string; ok: boolean; message: string } | null>(null);

    const available = AVAILABLE_PLUGINS.filter((plugin) => !installed?.some((p) => p.id === plugin.id));

    const onInstall = async (pluginId: string) => {
        setPendingId(pluginId);
        setNotice(null);
        startTransition(async () => {
            try {
                // Manifest entries carry no per-plugin config — the action's
                // config argument is optional and defaults to undefined.
                const result = await toggle_organization_plugin_action(orgId, true, pluginId);
                if (result && typeof result === "object" && "error" in result && result.error) {
                    throw new Error(String(result.error));
                }
                // InstalledExtensions does this after toggle/uninstall —
                // without it the new plugin never appears in Active
                // Extensions until a manual reload, so Install looked dead.
                router.refresh();
                setNotice({ pluginId, ok: true, message: "Installed — find it under Active Extensions to configure it." });
            } catch (error) {
                console.error("Failed to install plugin", error);
                setNotice({ pluginId, ok: false, message: (error as Error).message || "Install failed" });
            } finally {
                setPendingId(null);
            }
        });
    };

    return (
        <div className="space-y-6 px-4">
            <div className="space-y-1 border-t border-border pt-12">
                <h3 className="font-bold text-foreground">Recommended Extensions</h3>
                <p className="text-xs text-muted-foreground">Discovery tools to boost your recruitment pipeline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {available.map((plugin) => {
                    // No provider/factory exists for this plugin yet — it
                    // cannot be installed, so don't offer an Install button
                    // that silently does nothing useful.
                    const comingSoon = !plugin.hasProvider;
                    const installing = pendingId === plugin.id;
                    const pluginNotice = notice?.pluginId === plugin.id ? notice : null;
                    return (
                        <div key={plugin.id} className="bg-muted/50 p-6 rounded-2xl border border-border transition-all hover:bg-card hover:border-border shadow-sm relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", plugin.providerColor)}>
                                    <PluginIcon name={plugin?.icon as string} className={cn("w-6 h-6", plugin.providerColor)} />
                                </div>
                                {comingSoon ? (
                                    <span className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-bold">
                                        Coming soon
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onInstall(plugin.id)}
                                        disabled={installing}
                                        className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all disabled:opacity-50"
                                    >
                                        {installing ? "Installing…" : "Install"}
                                    </button>
                                )}
                            </div>
                            <h4 className="font-bold text-foreground">{plugin.name}</h4>
                            {/*<p className="text-xs text-muted-foreground font-medium">by {plugin.provider}</p>*/}
                            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                                {plugin.description}
                            </p>
                            {pluginNotice && (
                                <p className={cn("text-xs mt-3", pluginNotice.ok ? "text-emerald-500" : "text-red-500")}>
                                    {pluginNotice.ok ? "✓ " : "⚠ "}{pluginNotice.message}
                                </p>
                            )}
                            {/* No "Learn more" link: the manifest carries no docs URL
                                for any plugin, so the old dead span (no href, no
                                onClick) was removed rather than linked nowhere. */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AvailableExtensions;
