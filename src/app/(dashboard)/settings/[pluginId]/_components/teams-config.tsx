"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Teams Notifications settings.
//
// One webhook URL per org (encrypted at rest, like every other plugin
// secret) + a channel label + per-integration toggles. The webhook is
// bound to a single Teams channel when it is created, so the Channel
// field below is a display label only ("General"): it records which
// channel the webhook posts to, it does not route anything. To post to
// another channel, create another webhook in Teams and replace the URL.
//
// Create the webhook in Teams via the Workflows app (channel → Workflows
// → "Post to a channel when a webhook request is received"). Microsoft
// is retiring the classic Incoming Webhook (Office 365 Connector), so a
// Workflows URL is preferred; a legacy …webhook.office.com URL still
// works until Microsoft retires it.
//
// Connect = verify by posting a REAL test card to the webhook and
// reporting Teams' real answer (mirrors Resend/Google's verify-then-save
// flow). A test message is also postable any time afterwards through the
// saved webhook ("Send test message") — the browser never sees the URL.
// Note: a Workflows webhook answers 202 = "accepted", not "in the
// channel" — delivery is async, so check the channel after connecting.
// ─────────────────────────────────────────────────────────────────────────────
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { testTeamsWebhook, verifyTeamsWebhook } from "@/server/actions/plugin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import type { PluginAuthState } from "@/types";
import { ConfigProps, mask_key_for_display } from "./shared/types";
import { SetStateAction, useEffect, useMemo, useState } from "react";

const TeamsConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("teams-notify");
    const isConnected = auth.status === "authenticated";

    // webhookUrl holds ONLY a URL the user typed this session (pending save).
    // The stored URL is never sent to the browser — settings carries a
    // masked value (•••• + last 4), shown for display only.
    const [webhookUrl, setWebhookUrl] = useState("");
    const [reentering, setReentering] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Connect/test failures surface inline (via the error auth below)
    // with the server's real message — never a generic alert.
    const [connectError, setConnectError] = useState<string | null>(null);
    const maskedUrl = mask_key_for_display(settings?.credentials?.webhookUrl);
    // A stored (masked) URL means the plugin is configured even though
    // nothing was verified this session — config can still be saved.
    const hasSavedUrl = Boolean(maskedUrl);
    const displayAuth = connectError ? { status: "error" as const, error: connectError } : auth;

    // Test-send result for the SAVED webhook (separate from connect errors).
    const [testState, setTestState] = useState<{ ok: boolean; message: string } | null>(null);
    const [testing, setTesting] = useState(false);

    const provider = pluginRegistry.getProvider(pluginId);
    const INTERGRATIONS = provider?.getIntegrations();
    const [enabledIntegrations, setEnabledIntegrations] = useState(
        settings.enabledIntegrations
    );

    // Channel label — hydrated from stored settings so saving doesn't wipe
    // a value the user didn't touch this session.
    const [channel, setChannel] = useState(
        typeof settings?.config?.channel === "string" ? settings.config.channel : ""
    );
    useEffect(() => {
        const stored = settings?.config?.channel;
        if (typeof stored === "string") setChannel(stored);
    }, [settings]);

    // ── Dirty tracking (U8) ────────────────────────────────────────────────
    // Save is enabled whenever there are unsaved edits — a typed URL, a
    // channel edit, or a flipped integration toggle — not only once
    // connected/saved, and a beforeunload guard warns before navigating
    // away with edits.
    const initialChannel = useMemo(
        () => (typeof settings?.config?.channel === "string" ? settings.config.channel : ""),
        [settings],
    );
    const initialEnabled = useMemo(
        () => settings.enabledIntegrations ?? {},
        [settings],
    );
    const isDirty =
        webhookUrl.trim() !== "" ||
        channel !== initialChannel ||
        JSON.stringify(enabledIntegrations ?? {}) !== JSON.stringify(initialEnabled);

    useEffect(() => {
        if (!isDirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [isDirty]);

    const handleConnect = async (url?: string) => {
        // The URL comes from the section button — the parent's webhookUrl
        // state is still stale at click time (setState hasn't re-rendered yet).
        const urlToUse = (url ?? webhookUrl).trim();
        if (!urlToUse) return;
        setConnectError(null);
        setTestState(null);
        try {
            // 1. Verify ONLY — posts a real test message and reports
            // Teams' real answer. No badge change yet.
            const check = await verifyTeamsWebhook(urlToUse);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for a URL that isn't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { webhookUrl: urlToUse },
                config: { ...settings.config, ...(channel.trim() ? { channel: channel.trim() } : {}) },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies (posting a second test message — the same
            // double-verify Resend/Google do) and keeps only the masked
            // URL client-side.
            await authenticate("teams-notify", { webhookUrl: urlToUse });
            setWebhookUrl("");
            setReentering(false);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Teams");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        setTestState(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the URL.
            await onSave({ ...settings, active: false, credentials: {} });
            setWebhookUrl("");
            setReentering(false);
            await pluginRegistry.getProvider("teams-notify")?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Teams");
        }
    };

    // Post a test message through the SAVED webhook (decrypted server-side).
    const handleTestSaved = async () => {
        setTesting(true);
        setTestState(null);
        try {
            const result = await testTeamsWebhook();
            setTestState({ ok: result.success, message: result.message });
        } catch (e) {
            setTestState({ ok: false, message: (e as Error).message || "Failed to send test message" });
        } finally {
            setTesting(false);
        }
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            // Only send credentials when the user typed a NEW URL — otherwise
            // omit them and the server preserves the stored (encrypted) URL.
            // (Sending the masked display value back would be useless; the
            // server also refuses to overwrite a stored URL with a mask.)
            const next_settings: typeof settings = {
                ...settings,
                active: true,
                config: { ...settings.config, ...(channel.trim() ? { channel: channel.trim() } : {}) },
                enabledIntegrations,
            };
            if (webhookUrl.trim()) {
                next_settings.credentials = { webhookUrl: webhookUrl.trim() };
            } else {
                delete next_settings.credentials;
            }
            await onSave(next_settings);
            setWebhookUrl("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error("Failed to save Teams settings", e);
        } finally {
            setSaving(false);
        }
    };

    const showingStoredUrl = (isConnected || hasSavedUrl) && !reentering;

    return (
        <div className="relative">
            {/* Top bar */}
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                {/* Teams wordmark */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-card">
                        <span style={{ fontSize: 16 }}>🟪</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Teams</div>
                        <div className="text-xs text-background/20">
                            Microsoft Teams Notifications
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Status pill */}
                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedUrl ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedUrl ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedUrl ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full  bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedUrl ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedUrl ? "Saved" : "Not connected"}
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
                            Teams Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Posts to Teams when candidates move stages or apply — through one webhook, bound to one channel.
                        </p>
                    </div>

                    {/* Sections */}
                    <WebhookSection
                        webhookUrl={webhookUrl}
                        maskedUrl={maskedUrl}
                        showingStoredUrl={showingStoredUrl}
                        onWebhookUrlChange={setWebhookUrl}
                        onReenter={() => setReentering(true)}
                        auth={displayAuth}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        channel={channel}
                        onChannelChange={setChannel}
                        onTestSaved={handleTestSaved}
                        testing={testing}
                        testState={testState}
                        hasSavedUrl={hasSavedUrl}
                    />

                    <IntegrationsSection
                        enabled={enabledIntegrations}
                        onChange={setEnabledIntegrations}
                        intergrations={INTERGRATIONS!}
                        isConnected={isConnected || hasSavedUrl}
                    />
                </div>
            </div>
        </div>
    );
};

export default TeamsConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Webhook + channel section
// ─────────────────────────────────────────────────────────────────────────────
type WebhookSectionProps = {
    webhookUrl: string;
    maskedUrl?: string;
    showingStoredUrl: boolean;
    onWebhookUrlChange: (url: string) => void;
    onReenter: () => void;
    auth: PluginAuthState;
    onConnect: (url?: string) => void;
    onDisconnect: () => void;
    channel: string;
    onChannelChange: (channel: string) => void;
    onTestSaved: () => void;
    testing: boolean;
    testState: { ok: boolean; message: string } | null;
    hasSavedUrl: boolean;
};

const WebhookSection = ({
    webhookUrl,
    maskedUrl,
    showingStoredUrl,
    onWebhookUrlChange,
    onReenter,
    auth,
    onConnect,
    onDisconnect,
    channel,
    onChannelChange,
    onTestSaved,
    testing,
    testState,
    hasSavedUrl,
}: WebhookSectionProps) => {
    const isConnected = auth.status === "authenticated";
    const isLoading = auth.status === "authenticating";
    const [localUrl, setLocalUrl] = useState(webhookUrl);

    useEffect(() => {
        setLocalUrl(webhookUrl);
    }, [webhookUrl]);

    const statusText = isConnected ? "Connected · webhook verified this session" :
        isLoading ? "Verifying webhook…" :
            auth.status === "error" ? "Connection failed" :
                hasSavedUrl ? "Saved · webhook stored, not verified this session" :
                    "Not connected";

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Incoming Webhook
                </div>

                <div className="text-[11px] mt-0.5" >
                    Your webhook URL is encrypted at rest (AES-256-GCM) and never sent back to the browser — only the last 4 characters are shown
                </div>
            </div>

            <div className="my-5 px-4">
                <label style={{
                    display: "block", fontSize: 11, fontWeight: 600,
                    color: auth.status === "error" ? "#f87171" : "#6b7280",
                    fontFamily: "'Geist Mono', monospace",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    marginBottom: 6,
                }}>
                    Webhook URL
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            type="password"
                            value={showingStoredUrl ? (maskedUrl ?? "••••••••") : localUrl}
                            onChange={(v) => {
                                setLocalUrl(v.target.value);
                                onWebhookUrlChange(v.target.value);
                            }}
                            placeholder="https://….logic.azure.com/…"
                            disabled={showingStoredUrl}
                        />
                    </div>
                    {showingStoredUrl ? (
                        <Button variant="outline" onClick={onReenter}>
                            Replace webhook
                        </Button>
                    ) : (
                        <Button
                            onClick={() => onConnect(localUrl)}
                            disabled={!localUrl.trim() || isLoading}
                        >
                            {isLoading ? "Verifying…" : "Test & Connect"}
                        </Button>
                    )}
                    {isConnected && (
                        <Button variant="outline" onClick={onDisconnect}>
                            Disconnect
                        </Button>
                    )}
                </div>

                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    In Teams, open the channel → Workflows → “Post to a channel when a webhook request is received” and copy the URL. A Workflows webhook answers 202 = accepted (delivery is async — check the channel). Classic Incoming Webhook URLs (…webhook.office.com) still work but Microsoft is retiring them.
                    Connecting posts a real test card to the channel.
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    Status: {statusText}
                </p>
                {auth.status === "error" && auth.error && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                        ⚠ {auth.error}
                    </p>
                )}

                {/* Test the SAVED webhook — posts a real test message through
                    the stored URL, decrypted server-side. */}
                {hasSavedUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                        <Button variant="outline" onClick={onTestSaved} disabled={testing}>
                            {testing ? "Sending…" : "Send test message"}
                        </Button>
                        {testState && (
                            <span style={{
                                fontSize: 11, fontFamily: "monospace",
                                color: testState.ok ? "#10b981" : "#f87171",
                            }}>
                                {testState.ok ? "✓ " : "⚠ "}{testState.message}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="my-5 px-4">
                <label style={{
                    display: "block", fontSize: 11, fontWeight: 600,
                    color: "#6b7280",
                    fontFamily: "'Geist Mono', monospace",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    marginBottom: 6,
                }}>
                    Channel
                </label>
                <Input
                    value={channel}
                    onChange={e => onChannelChange(e.target.value)}
                    placeholder="General"
                />
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    Label only — Teams posts to the channel chosen when the webhook was created.
                    To post to another channel, create another webhook in Teams and replace the URL above.
                </p>
            </div>
        </section>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Integration toggles — mirrors Google's IntegrationsSection pattern.
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
                    Toggle which Teams notifications fire. Stage moves only post through an automation rule (trigger: stage changed → action: fire the Teams integration) — new applications post automatically once toggled on.
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
