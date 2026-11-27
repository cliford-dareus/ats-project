"use client";

import { PluginIcon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { toggle_organization_plugin_action, update_organization_plugins_action } from "@/server/actions/organization_actions";
import { InstalledPlugin } from "@/types";
import { Loader2, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProviderBadge } from "./provider-badge";

type InstalledExtensionsProps = {
    orgId: string;
    installed: InstalledPlugin[];
};

/** Surface a server action's `{ error }` return instead of throwing it away. */
function actionErrorMessage(result: unknown): string | null {
    if (result && typeof result === "object" && "error" in result && result.error) {
        return String(result.error);
    }
    return null;
}

const InstalledExtensions = ({ installed, orgId }: InstalledExtensionsProps) => {
     const router = useRouter();
    const [, startTransition] = useTransition();
    // Per-plugin pending id (not one shared boolean): only the clicked
    // card's button spins, and only that button is disabled while pending.
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ pluginId: string; ok: boolean; message: string } | null>(null);


    const onToggleActive = async (plugin: InstalledPlugin, nextActive: boolean) => {
        // Deactivate is destructive to running automations — confirm it,
        // matching the existing uninstall confirm below.
        if (!nextActive && !confirm(`Deactivate ${plugin.name}? Automations using it will stop working until you reactivate it.`)) return;
        setPendingId(plugin.id);
        setNotice(null);
        startTransition(async () => {
            try {
                // Flip only the active flag — merge with the stored settings so
                // credentials/config are preserved (passing a bare boolean here
                // used to replace the whole settings object).
                const result = await update_organization_plugins_action(orgId, { ...plugin.settings, active: nextActive }, plugin.id);
                const errorMessage = actionErrorMessage(result);
                if (errorMessage) throw new Error(errorMessage);
                router.refresh();
            } catch (error) {
                console.error("Failed to toggle plugin status", error);
                setNotice({ pluginId: plugin.id, ok: false, message: (error as Error).message || "Failed to update plugin status" });
            } finally {
                setPendingId(null);
            }
        });
    };

    const onUninstall = async (pluginId: string) => {
        if (!confirm("Are you sure you want to uninstall this extension?")) return;

        setPendingId(pluginId);
        setNotice(null);
        startTransition(async () => {
            try {
                // Assuming false removes it or deactivates it based on your backend logic
                const result = await toggle_organization_plugin_action(orgId, false, pluginId);
                const errorMessage = actionErrorMessage(result);
                if (errorMessage) throw new Error(errorMessage);
                router.refresh();
            } catch (error) {
                console.error("Failed to uninstall plugin", error);
                setNotice({ pluginId, ok: false, message: (error as Error).message || "Failed to uninstall plugin" });
            } finally {
                setPendingId(null);
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
                {installed.map((plugin) => {
                    const pending = pendingId === plugin.id;
                    const pluginNotice = notice?.pluginId === plugin.id ? notice : null;
                    return (
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
                                    disabled={pending}
                                    className={cn(
                                        "p-2 rounded-lg transition-all disabled:opacity-50",
                                        plugin.settings.active ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                                    )}
                                    title={plugin.settings.active ? "Deactivate" : "Activate"}
                                >
                                    {pending ? (
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
                        {pluginNotice && (
                            <p className={cn("text-xs mt-3", pluginNotice.ok ? "text-emerald-500" : "text-red-500")}>
                                {pluginNotice.ok ? "✓ " : "⚠ "}{pluginNotice.message}
                            </p>
                        )}

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
                                    disabled={pending}
                                    className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                >
                                    Uninstall
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <ProviderBadge
                                    providerId={plugin.id}
                                    hasSavedKey={Boolean(plugin.settings.credentials?.apiKey)}
                                    active={plugin.settings.active}
                                />
                            </div>
                        </div>
                    </div>
                    );
                }
                )}
            </div>
        </div>
    );
};

export default InstalledExtensions;

// ─────────────────────────────────────────────────────────────────────────────
// Inactive extensions (U3)
//
// A deactivated plugin still has a settings row and stays in the org's
// `enabled` list — only its `active` flag is false. build_org_plugin_state
// omits it from `installed`, so without this section the card vanished and
// the plugin reappeared under Recommended with an Install button, and a
// direct link to /settings/<id> said "Plugin not found". These plugins
// live here instead, with a Reactivate button that flips `active` back on
// (the `enabled` entry is untouched by deactivation, so the update action
// alone restores it). Uninstalled plugins have no `enabled` entry and
// their credentials were cleared — they correctly stay under Recommended.
// ─────────────────────────────────────────────────────────────────────────────

/** Reactivate a deactivated plugin (flip `active` back on, keeping its config). */
export function ReactivateButton({ plugin, orgId }: { plugin: InstalledPlugin; orgId: string }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onReactivate = () => {
        setPending(true);
        setError(null);
        startTransition(async () => {
            try {
                const result = await update_organization_plugins_action(orgId, { ...plugin.settings, active: true }, plugin.id);
                const errorMessage = actionErrorMessage(result);
                if (errorMessage) throw new Error(errorMessage);
                router.refresh();
            } catch (e) {
                console.error("Failed to reactivate plugin", e);
                setError((e as Error).message || "Failed to reactivate plugin");
            } finally {
                setPending(false);
            }
        });
    };

    return (
        <span className="flex flex-col items-start gap-1">
            <button
                onClick={onReactivate}
                disabled={pending}
                className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all disabled:opacity-50"
            >
                {pending ? "Reactivating…" : "Reactivate"}
            </button>
            {error && <span className="text-xs text-red-500">⚠ {error}</span>}
        </span>
    );
}

export function InactiveExtensions({ installed, orgId }: InstalledExtensionsProps) {
    const router = useRouter();
    if (installed.length === 0) return null;

    return (
        <div className="space-y-6 px-4">
            <div className="space-y-1 border-t border-border pt-12">
                <h3 className="font-bold text-foreground">Inactive Extensions</h3>
                <p className="text-xs text-muted-foreground">Installed but deactivated — their settings are kept. Reactivate to use them again.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {installed.map((plugin) => (
                    <div key={plugin.id} className="bg-card p-6 rounded-2xl border border-border opacity-75">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative", plugin.providerColor)}>
                                <PluginIcon name={plugin.id} className="w-6 h-6" />
                            </div>
                            <ReactivateButton plugin={plugin} orgId={orgId} />
                        </div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground">{plugin.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed min-h-[40px]">
                            {plugin.description}
                        </p>
                        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                            <button
                                onClick={() => router.push(`/settings/${plugin.id}`)}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Settings
                            </button>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <ProviderBadge
                                    providerId={plugin.id}
                                    hasSavedKey={Boolean(plugin.settings.credentials?.apiKey)}
                                    active={false}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
