// ─────────────────────────────────────────────────────────────────────────────
// API Key section
// ─────────────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "lucide-react";
import { useState } from "react";


type Props = {
    apiKey: string;
    onApiKeyChange: (apiKey: string) => void;
    auth: {
        status: "authenticated" | "unauthenticated" | "authenticating" | "error";
        error?: string;
    };
    onConnect: () => void;
    onDisconnect: () => void;
    pluginId: string;
}

const ApiKeySection = ({ apiKey, onApiKeyChange, auth, onConnect, onDisconnect, pluginId }: Props) => {
    const [show, setShow] = useState(false);
    const [localKey, setLocalKey] = useState(apiKey);
    const isConnected = auth.status === "authenticated";
    const isLoading = auth.status === "authenticating";

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Authentication
                </div>

                <div className="text-[11px] mt-0.5" >
                    Your API key is stored encrypted and never exposed to the client
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
                            value={isConnected ? "re_••••••••••••••••••••••••" : localKey}
                            onChange={(v) => setLocalKey(v.target.value)}
                            placeholder="re_live_••••••••••••••••••"
                            disabled={isConnected}
                        />
                        {!isConnected && (
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

                    {isConnected ? (
                        <Button
                            onClick={onDisconnect}

                        >
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            onClick={() => { onApiKeyChange(localKey); onConnect(); }}
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

                {!isConnected && auth.status !== "error" && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                        {`Don't have an API key? Create one at ${pluginId}.com — 'Sending access' permission is enough`}
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
                    background:
                        isConnected ? "#10b981" :
                            isLoading ? "#f59e0b" :
                                auth.status === "error" ? "#f87171" : "#374151",
                    boxShadow: isConnected ? "0 0 6px #10b981" : "none",
                    animation: isLoading ? "pulse 1s ease-in-out infinite" : "none",
                }} />
                <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'Geist Mono', monospace" }}>
                    {isConnected ? `Connected · ${pluginId} API verified` :
                        isLoading ? "Verifying API key…" :
                            auth.status === "error" ? "Connection failed" :
                                "Not connected"}
                </span>
                {isConnected && (
                    <Badge className="" color="#10b981" bg="#0d1a14">ACTIVE</Badge>
                )}
            </div>
        </section>
    );
};

export default ApiKeySection;
