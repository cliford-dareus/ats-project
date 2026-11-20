import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import ApiKeySection from "./shared/api-key-section";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    const maskedKey = mask_key_for_display(settings?.credentials?.apiKey);

    const handleConnect = async (key?: string) => {
        // The key comes from ApiKeySection — the parent's apiKey state is
        // still stale at click time (setState hasn't re-rendered yet).
        const apiKeyToUse = (key ?? apiKey).trim();
        if (!apiKeyToUse) return;
        try {
            await authenticate("google", { apiKey: apiKeyToUse });
            // auth.status is now "authenticated" — badge updates automatically
            // because authenticate() calls pluginRegistry.stateManager.setState()
            // which triggers useSyncExternalStore re-renders everywhere
            // Persist the verified credentials for the session org.
            // (Encrypted server-side on save; the parent adopts the masked
            // settings the server returns.)
            await onSave({ ...settings, active: true, credentials: { apiKey: apiKeyToUse } });
            setApiKey("");
        } catch (e) {
            // auth.status is now "error", auth.error has the
            const error = e as Error;
            console.error(error);
        }
    };

    const handleDisconnect = async () => {
        try {
            setApiKey("");
            await pluginRegistry.getProvider("google")?.deauthenticate();
            // Clear the stored credentials for the session org.
            await onSave({ ...settings, active: false, credentials: {} });
        } catch (e) {
            console.error("Failed to disconnect Google", e);
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
            const next_settings: typeof settings = { ...settings, active: true };
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
                            Google Suites Integration
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Status pill */}
                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : "#4b5563",
                        // fontFamily: "'Geist Mono', monospace",
                    }}>
                    <div className="w-5 h-5 rounded-full  bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full bg-[#10b981] dark:bg-[#374151]" />
                    </div>
                    {isConnected ? "Connected" : "Not connected"}
                </div>

                {/* Save */}
                <Button
                    onClick={handleSave}
                    disabled={!isConnected || saving}
                    className="rounded-md"
                    style={{
                        padding: "7px 18px", borderRadius: 6,
                        background: saved ? "#0d1a14" : (isConnected ? "#fff" : "#111"),
                        border: saved ? "1px solid #10b981" : "none",
                        color: saved ? "#10b981" : (isConnected ? "#000" : "#374151"),
                        fontSize: 12, fontWeight: 600,
                        cursor: isConnected ? "pointer" : "not-allowed",
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
                            Configure your Google integration
                        </p>
                    </div>

                    {/* Sections */}
                    <ApiKeySection
                        apiKey={apiKey}
                        maskedKey={maskedKey}
                        onApiKeyChange={setApiKey}
                        auth={auth}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        pluginId={pluginId}
                    />
                </div>
            </div>
        </div>
    );
};

export default GoogleConfig;
