import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { verifyAnthropic } from "@/server/actions/plugin-actions";
import ApiKeySection from "./shared/api-key-section";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfigProps, mask_key_for_display } from "./shared/types";

// Model actually called by src/server/ai/anthropic-screening.ts — keep
// this label in sync with ANTHROPIC_SCREENING_MODEL there; the card on the
// application page shows the stored model per generation, this is just the
// configured default.
const ANTHROPIC_MODEL_LABEL = "claude-sonnet-4-5-20250929";

const AnthropicConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("anthropic-screening");
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

    // ── Dirty tracking ────────────────────────────────────────────────────
    // Save is enabled whenever there are unsaved edits — a typed key —
    // not only once connected/saved, and a beforeunload guard warns
    // before navigating away with edits.
    const isDirty = apiKey.trim() !== "";

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
            const check = await verifyAnthropic(apiKeyToUse);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for a key that isn't stored.
            await onSave({ ...settings, active: true, credentials: { apiKey: apiKeyToUse } });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked key client-side.
            await authenticate("anthropic-screening", { apiKey: apiKeyToUse });
            setApiKey("");
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Anthropic");
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
            await pluginRegistry.getProvider("anthropic-screening")?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Anthropic");
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
            console.error("Failed to save Anthropic settings", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            {/* Top bar */}
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-card">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 5.5L12 12L21 5.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#000" strokeWidth="2" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Anthropic</div>
                        <div className="text-xs text-background/20">
                            Claude Candidate Screening
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
                    }}>
                    <div className="w-5 h-5 rounded-full  bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedKey ? "Saved" : "Not connected"}
                </div>

                {/* Unsaved-changes indicator */}
                {isDirty && !saving && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#f59e0b" }}>
                        ● Unsaved changes
                    </span>
                )}

                {/* Save — enabled whenever there are unsaved edits, not
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
                            Anthropic Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Uses Claude to generate structured interview questions and stage-aware insights for a candidate, on demand from the application page.
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

                    {/* Model — read-only: the generation call uses this
                        model; there is no per-org model picker. The
                        application page shows the model per generation. */}
                    <section className="bg-card overflow-hidden rounded-md mb-3 border">
                        <div className="px-5 py-4 border-b bg-transparent">
                            <div className="text-[13px] uppercase tracking-wide font-bold">
                                Model
                            </div>
                            <div className="text-[11px] mt-0.5">
                                Questions are generated on demand from the application page — nothing runs automatically, so no API quota is spent until a recruiter asks for questions.
                            </div>
                        </div>
                        <div className="px-5 py-4 flex items-center gap-3">
                            <span className="text-[13px] font-semibold" style={{ fontFamily: "'Geist Mono', monospace" }}>
                                {ANTHROPIC_MODEL_LABEL}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Claude Sonnet — structured questions + stage-aware insights, grounded in the real job description and resume.
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AnthropicConfig;
