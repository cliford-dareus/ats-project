// ─────────────────────────────────────────────────────────────────────────────
// API Key section
//
// Honest auth states — a stored key is NEVER "verified" on page load:
//   • "authenticated"  — this session's key was just verified via
//     authenticate() (verifyGoogle / verifyResend). Only this state
//     shows "Connected · API verified".
//   • saved key only   — the server sent a MASKED value (•••• + last 4),
//     so a key is stored but nothing was verified this session:
//     "Saved · key stored, not verified this session".
//   • generic mask     — the stored key could not be decrypted (e.g. the
//     encryption key was rotated without a re-encryption pass), so the
//     server could only send "••••••••": "needs re-entry".
// ─────────────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

/** Generic mask the server sends when it cannot decrypt a stored key. */
const GENERIC_MASK = "••••••••";

/** Where to create a key, per provider — the old generic hint sent
 * Google users to "google.com" for a key with "'Sending access'
 * permission", which is Resend-only and wrong for both. */
const KEY_HINTS: Record<string, { url: string; note: string }> = {
    google: { url: "aistudio.google.com", note: "create a Gemini API key in Google AI Studio" },
    "openai-scoring": { url: "platform.openai.com", note: "create an API key under API keys — the account needs billing enabled" },
    resend: { url: "resend.com", note: "'Sending access' permission is enough" },
    calendly: { url: "calendly.com", note: "Profile → Developer → Personal access tokens — select the scopes listed below" },
    "anthropic-screening": { url: "console.anthropic.com", note: "create an API key in the Anthropic Console" },
};

type Props = {
    apiKey: string;
    /** Masked stored key (•••• + last 4) for display while connected.
     *  The full key is never sent to the browser. */
    maskedKey?: string;
    onApiKeyChange: (apiKey: string) => void;
    auth: {
        status: "authenticated" | "unauthenticated" | "authenticating" | "error";
        error?: string;
    };
    onConnect: (apiKey: string) => void;
    onDisconnect: () => void;
    pluginId: string;
}

const ApiKeySection = ({ apiKey, maskedKey, onApiKeyChange, auth, onConnect, onDisconnect, pluginId }: Props) => {
    const [show, setShow] = useState(false);
    const [localKey, setLocalKey] = useState(apiKey);
    const [reentering, setReentering] = useState(false);
    const isConnected = auth.status === "authenticated";
    const isLoading = auth.status === "authenticating";
    // A masked value proves a key is STORED, not that it works: providers
    // only report "authenticated" after a verify call this session.
    const hasSavedKey = !isConnected && !!maskedKey;
    const needsReentry = hasSavedKey && maskedKey === GENERIC_MASK;
    const showingStoredKey = isConnected || (hasSavedKey && !reentering);

    // Keep the input in sync when the parent clears its key state
    // (after a save, or on disconnect) so a stale typed key doesn't
    // reappear in the input.
    useEffect(() => {
        setLocalKey(apiKey);
    }, [apiKey]);

    // A new stored key (connect) or a cleared one (disconnect) ends any
    // re-entry in progress.
    useEffect(() => {
        setReentering(false);
    }, [maskedKey]);

    const statusText = isConnected ? `Connected · ${pluginId} API verified this session` :
        isLoading ? "Verifying API key…" :
            auth.status === "error" ? "Connection failed" :
                needsReentry ? "Saved key couldn't be read — re-enter your key" :
                    hasSavedKey ? "Saved · key stored, not verified this session" :
                        "Not connected";
    const dotColor = isConnected ? "#10b981" :
        isLoading ? "#f59e0b" :
            auth.status === "error" ? "#f87171" :
                needsReentry ? "#f59e0b" :
                    hasSavedKey ? "#9ca3af" : "#374151";

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Authentication
                </div>

                <div className="text-[11px] mt-0.5" >
                    Your API key is encrypted at rest (AES-256-GCM) and never sent back to the browser — only the last 4 characters are shown
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
                    API Key
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <Input
                            type={show ? "text" : "password"}
                            value={showingStoredKey ? (maskedKey ?? GENERIC_MASK) : localKey}
                            onChange={(v) => setLocalKey(v.target.value)}
                            placeholder={pluginId === "google" ? "AIza••••••••••••••••••••••••••" : pluginId === "calendly" ? "eyJraWQ••••••••••••••••••••••••••" : "re_live_••••••••••••••••••"}
                            disabled={showingStoredKey}
                        />
                        {!showingStoredKey && (
                            <button
                                onClick={() => setShow(s => !s)}
                                style={{
                                    position: "absolute", right: 10, top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none", border: "none",
                                    color: "#374151", cursor: "pointer", fontSize: 12,
                                }}
                            >
                                {show ? "hide" : "show"}
                            </button>
                        )}
                    </div>

                    {showingStoredKey ? (
                        <Button
                            onClick={onDisconnect}

                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            onClick={() => { onApiKeyChange(localKey); onConnect(localKey); }}
                            disabled={!localKey.trim() || isLoading}
                            style={{
                                padding: "9px 18px", borderRadius: 6,
                                background: localKey.trim() && !isLoading ? "#10b981" : "#0d1a14",
                                border: "none",
                                color: localKey.trim() && !isLoading ? "#000" : "#1f4a36",
                                fontSize: 12, fontWeight: 600, cursor: localKey.trim() ? "pointer" : "not-allowed",
                                fontFamily: "'Geist Mono', monospace", whiteSpace: "nowrap",
                                transition: "all 0.15s",
                            }}
                        >
                            {isLoading ? "Verifying…" : "Connect"}
                        </Button>
                    )}
                </div>

                {hasSavedKey && !reentering && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                        <button
                            onClick={() => { setLocalKey(""); setReentering(true); }}
                            style={{ background: "none", border: "none", padding: 0, color: "#9ca3af", cursor: "pointer", fontSize: 11, fontFamily: "monospace", textDecoration: "underline" }}
                        >
                            Re-enter a different key
                        </button>
                    </p>
                )}
                {reentering && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                        <button
                            onClick={() => setReentering(false)}
                            style={{ background: "none", border: "none", padding: 0, color: "#9ca3af", cursor: "pointer", fontSize: 11, fontFamily: "monospace", textDecoration: "underline" }}
                        >
                            Cancel — keep the saved key
                        </button>
                    </p>
                )}

                {!showingStoredKey && auth.status !== "error" && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                        {`Don't have an API key? Create one at ${KEY_HINTS[pluginId]?.url ?? `${pluginId}.com`}${KEY_HINTS[pluginId]?.note ? ` — ${KEY_HINTS[pluginId].note}` : ""}`}
                    </p>
                )}
                {auth.status === "error" && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                        ⚠ {auth.error}
                    </p>
                )}
            </div>

            {/* Status row */}
            <div className="flex items-center gap-3 py-[10px] px-[14px] bg-foreground rounded-md border">
                <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: dotColor,
                    boxShadow: isConnected ? "0 0 6px #10b981" : "none",
                    animation: isLoading ? "pulse 1s ease-in-out infinite" : "none",
                }} />
                <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'Geist Mono', monospace" }}>
                    {statusText}
                </span>
                {isConnected && (
                    <Badge style={{ color: "#10b981", backgroundColor: "#0d1a14" }}>ACTIVE</Badge>
                )}
                {hasSavedKey && !isConnected && (
                    <Badge style={{ color: "#9ca3af", backgroundColor: "#111827" }}>SAVED</Badge>
                )}
            </div>
        </section>
    );
};

export default ApiKeySection;
