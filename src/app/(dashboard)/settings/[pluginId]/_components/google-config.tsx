import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyGoogle } from "@/server/actions/plugin-actions";
import ApiKeySection from "./shared/api-key-section";
import { SetStateAction, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { ConfigProps, mask_key_for_display } from "./shared/types";

const GoogleConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("google");
    const isConnected = auth.status === "authenticated";

    // apiKey holds ONLY a key the user typed this session (pending save).
    // The stored key is never sent to the browser — settings carries a
    // masked value (•••• + last 4), shown for display only.
    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Connect/disconnect failures surface inline (via the error auth
    // below) with the server's real message — never a generic alert.
    const [connectError, setConnectError] = useState<string | null>(null);
    const maskedKey = mask_key_for_display(settings?.credentials?.apiKey);
    // A stored (masked) key means the plugin is configured even though
    // nothing was verified this session — config can still be saved.
    const hasSavedKey = Boolean(maskedKey);
    const displayAuth = connectError ? { status: "error" as const, error: connectError } : auth;

    // U10: the resume-score integration toggle, wired to
    // enabledIntegrations like Resend's IntegrationsSection. Google
    // previously had no integration control at all — the key was the
    // whole config, so scoring could not be turned off without
    // disconnecting.
    const provider = pluginRegistry.getProvider(pluginId);
    const INTERGRATIONS = provider?.getIntegrations();
    const [enabledIntegrations, setEnabledIntegrations] = useState(
        settings.enabledIntegrations
    );

    // ── Dirty tracking (U8) ────────────────────────────────────────────────
    // Save is enabled whenever there are unsaved edits — a typed key or
    // a flipped integration toggle — not only once connected/saved, and
    // a beforeunload guard warns before navigating away with edits.
    const initialEnabled = useMemo(
        () => settings.enabledIntegrations ?? {},
        [settings],
    );
    const isDirty =
        apiKey.trim() !== "" ||
        JSON.stringify(enabledIntegrations ?? {}) !== JSON.stringify(initialEnabled);

    useEffect(() => {
        if (!isDirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [isDirty]);

    const handleConnect = async (key?: string) => {
        // The key comes from ApiKeySection — the parent's apiKey state is
        // still stale at click time (setState hasn't re-rendered yet).
        const apiKeyToUse = (key ?? apiKey).trim();
        if (!apiKeyToUse) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — no badge change yet.
            const check = await verifyGoogle(apiKeyToUse);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for a key that isn't stored.
            await onSave({ ...settings, active: true, credentials: { apiKey: apiKeyToUse } });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked key client-side.
            await authenticate("google", { apiKey: apiKeyToUse });
            setApiKey("");
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Google");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the key.
            await onSave({ ...settings, active: false, credentials: {} });
            setApiKey("");
            await pluginRegistry.getProvider("google")?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Google");
        }
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            // Only send credentials when the user typed a NEW key — otherwise
            // omit them and the server preserves the stored (encrypted) key.
            // (Sending the masked display value back would be useless; the
            // server also refuses to overwrite a stored key with a mask.)
            const next_settings: typeof settings = {
                ...settings,
                active: true,
                enabledIntegrations,
            };
            if (apiKey.trim()) {
                next_settings.credentials = { apiKey: apiKey.trim() };
            } else {
                delete next_settings.credentials;
            }
            await onSave(next_settings);
            setApiKey("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error("Failed to save Google settings", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            {/* Top bar */}
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                {/* Resend wordmark */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-card">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 5.5L12 12L21 5.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#000" strokeWidth="2" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Google</div>
                        <div className="text-xs text-background/20">
                            Gemini Resume Scoring
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Status pill */}
                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedKey ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#4b5563",
                        // fontFamily: "'Geist Mono', monospace",
                    }}>
                    <div className="w-5 h-5 rounded-full  bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedKey ? "Saved" : "Not connected"}
                </div>

                {/* Unsaved-changes indicator (U8) */}
                {isDirty && !saving && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#f59e0b" }}>
                        ● Unsaved changes
                    </span>
                )}

                {/* Save — enabled whenever there are unsaved edits (U8), not
                    only once connected/saved. */}
                <Button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="rounded-md"
                    style={{
                        padding: "7px 18px", borderRadius: 6,
                        background: saved ? "#0d1a14" : (isDirty ? "#fff" : "#111"),
                        border: saved ? "1px solid #10b981" : "none",
                        color: saved ? "#10b981" : (isDirty ? "#000" : "#374151"),
                        fontSize: 12, fontWeight: 600,
                        cursor: isDirty ? "pointer" : "not-allowed",
                        fontFamily: "'Geist Mono', monospace",
                        transition: "all 0.2s",
                    }}
                >
                    {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
                </Button>
            </div>

            <div className="space-y-6 border rounded-md p-4">
                <div>
                    {/* Page header */}
                    <div className="mb-6">
                        <h1 className="text-[20px] font-semibold tracking-tight">
                            Google Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Uses Gemini to score resumes 0–100 on fit, skills, and experience when a candidate applies or uploads a resume.
                        </p>
                    </div>

                    {/* Sections */}
                    <ApiKeySection
                        apiKey={apiKey}
                        maskedKey={maskedKey}
                        onApiKeyChange={setApiKey}
                        auth={displayAuth}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        pluginId={pluginId}
                    />

                    <IntegrationsSection
                        enabled={enabledIntegrations}
                        onChange={setEnabledIntegrations}
                        intergrations={INTERGRATIONS!}
                        isConnected={isConnected || hasSavedKey}
                    />
                </div>
            </div>
        </div>
    );
};

export default GoogleConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Integration toggles (U10) — mirrors Resend's IntegrationsSection pattern.
// ─────────────────────────────────────────────────────────────────────────────
type IntergrationSectionProps = {
    enabled: Record<string, boolean> | undefined;
    onChange: React.Dispatch<SetStateAction<Record<string, boolean> | undefined>>;
    isConnected: boolean;
    intergrations: ATSIntegration[]
};

function IntegrationsSection({ enabled, onChange, isConnected, intergrations }: IntergrationSectionProps) {
    const triggerColors = {
        candidate_applied: { color: "#818cf8", bg: "#1e1b4b" },
        stage_changed: { color: "#0ea5e9", bg: "#0c1a2e" },
        interview_scheduled: { color: "#8b5cf6", bg: "#1a0d2e" },
        offer_extended: { color: "#f59e0b", bg: "#1f1500" },
        resume_uploaded: { color: "#2dd4bf", bg: "#0d1f1c" },
        score_updated: { color: "#10b981", bg: "#0d1a14" },
    };

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="px-5 py-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Active Integrations
                </div>

                <div className="text-[11px] mt-0.5" >
                    Toggle which automations fire. Individual integrations can also be controlled per pipeline stage.
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {intergrations?.map((intg) => {
                    const trigger = intg.getSupportedTriggers()[0].on[0]
                    const tc = triggerColors[trigger] ?? { color: "#6b7280", bg: "#111" };
                    const isEnabled = (enabled && enabled[intg.id]) ?? false;

                    return (
                        <div
                            key={intg.id}
                            style={{
                                display: "flex", alignItems: "center", gap: 14,
                                padding: "12px 14px", borderRadius: 8,
                                background: isEnabled ? "#0d0d0d" : "transparent",
                                border: `1px solid ${isEnabled ? "#1f1f1f" : "transparent"}`,
                                transition: "all 0.15s",
                                opacity: !isConnected ? 0.4 : 1,
                            }}
                        >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{intg.icon}</span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap",
                                }}>
                                    <span style={{
                                        fontSize: 13, fontWeight: 600, color: "#d1d5db",
                                        fontFamily: "'Instrument Sans', sans-serif",
                                    }}>
                                        {intg.name}
                                    </span>
                                    <Badge style={{ color: tc.color, backgroundColor: tc.bg }}>{trigger}</Badge>
                                    {intg.to && (
                                        <Badge style={{ color: "#4b5563", backgroundColor: "#0a0a0a" }}>→ {intg.to}</Badge>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", lineHeight: 1.5 }}>
                                    {intg.description}
                                </div>
                            </div>

                            <Switch
                                checked={isEnabled}
                                onCheckedChange={v => onChange({ ...enabled, [intg.id]: v })}
                                disabled={!isConnected}
                            />
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
