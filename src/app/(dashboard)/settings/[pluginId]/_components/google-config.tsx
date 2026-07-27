import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import ApiKeySection from "./shared/api-key-section";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const GoogleConfig = ({ pluginId, onSave, settings }) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("google");
    const isConnected = auth.status === "authenticated";

    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (settings?.apiKey) {
            setApiKey(settings.apiKey);
        }
    }, [settings]);

    const handleConnect = async () => {
        try {
            await authenticate("google", { apiKey: apiKey });
            // auth.status is now "authenticated" — badge updates automatically
            // because authenticate() calls pluginRegistry.stateManager.setState()
            // which triggers useSyncExternalStore re-renders everywhere
        } catch (e) {
            // auth.status is now "error", auth.error has the message
        }
    };

    const handleDisconnect = async() => {
        setApiKey("");
        await authenticate("google", { apiKey: apiKey });
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            // Real: await savePluginSettings("resend", { credentials: { apiKey }, config, enabledIntegrations })
            await new Promise(r => setTimeout(r, 700));
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
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
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
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
                    <div className="w-5 h-5 rounded-full  bg-white shadow-[0_0_4px_#10b981] dark:bg-gray-800 dark:shadow-[0_0_4px_#374151]">
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
                        <p className="mt-1 text-[13px] text-gray-400 leading-tight">
                            Configure your Google integration
                        </p>
                    </div>

                    {/* Sections */}
                    <ApiKeySection
                        apiKey={apiKey}
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
