"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { pluginRegistry } from "@/lib/plugin-registry";
import { Badge } from "lucide-react";
import { SetStateAction, useEffect, useState } from "react";
import { ConfigProps } from "./shared/types";
import ApiKeySection from "./shared/api-key-section";


const ResendConfig = ({ pluginId, onSave, settings }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("resend");
    const isConnected = auth.status === "authenticated";

    const [apiKey, setApiKey] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [domains, setDomains] = useState([]);
    const [domainsLoading, ] = useState(false);

    const provider = pluginRegistry.getProvider(pluginId);
    const INTERGRATIONS = provider?.getIntegrations();
    const [enabledIntegrations, setEnabledIntegrations] = useState(
        settings.enabledIntegrations
    );

    // console.log(INTERGRATIONS, save)

    const [config, setConfig] = useState({
        companyName: "",
        fromAlias: "recruiting",
        fromDomain: "",
        hiringManagerEmail: "",
        recruiterEmail: "",
        offerSigningUrl: "",
    });

    useEffect(() => {
        if (settings?.credentials?.apiKey) {
            setApiKey(settings.credentials.apiKey);
        }
    }, [settings]);

    const handleConnect = async () => {
        try {
            await authenticate("resend", { apiKey: apiKey });
            // auth.status is now "authenticated" — badge updates automatically
            // because authenticate() calls pluginRegistry.stateManager.setState()
            // which triggers useSyncExternalStore re-renders everywhere
        } catch (e) {
            // auth.status is now "error", auth.error has the message
        }
    };

    const handleDisconnect = () => {
        setDomains([]);
        setApiKey("");
    };

    // const loadDomains = async (key) => {
    //     setDomainsLoading(true);
    //     try {
    //         // Real: const res = await fetch("/api/plugins/resend/domains");
    //         await new Promise(r => setTimeout(r, 800));
    //         setDomains([
    //             { name: "mail.acme.com", verified: true },
    //             { name: "hiring.acme.com", verified: true },
    //             { name: "noreply.acme.com", verified: true },
    //         ]);
    //     } finally {
    //         setDomainsLoading(false);
    //     }
    // };

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

    // const fromAddress = config.fromAlias && config.fromDomain
    //     ? `${config.fromAlias}@${config.fromDomain}`
    //     : "";

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
                        <div className="text-sm font-semibold text-background/80">Resend</div>
                        <div className="text-xs text-background/20">
                            Email Integration
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
                            Resend Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-gray-400 leading-tight">
                            Configure transactional email for your hiring pipeline — candidate confirmations, stage updates, offer letters, and internal reports.
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

                    <SenderSection
                        config={config}
                        onChange={setConfig}
                        domains={domains}
                        auth={auth}
                        domainsLoading={domainsLoading}
                    />

                    <IntegrationsSection
                        enabled={enabledIntegrations}
                        onChange={setEnabledIntegrations}
                        intergrations={INTERGRATIONS!}
                        isConnected={isConnected}
                    />
                </div>
            </div>
        </div>
    )
};

export default ResendConfig;



// ─────────────────────────────────────────────────────────────────────────────
// Sender config
// ─────────────────────────────────────────────────────────────────────────────
//@ts-expect-error
const SenderSection = ({ config, onChange, domains, domainsLoading, auth, }) => {
    const isConnected = auth.status === "authenticated";
    // const domainOptions = domains.length > 0
    //     ? domains
    //     : [{ name: "No verified domains", verified: false }];

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Sender Configuration
                </div>

                <div className="text-[11px] mt-0.5" >
                    Controls the From address and company branding on all outgoing emails
                </div>
            </div>

            <div className="p-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
                <div className="mt-5">
                    <label style={{
                        display: "block", fontSize: 11, fontWeight: 600,
                        color: auth.status === "error" ? "#f87171" : "#6b7280",
                        fontFamily: "'Geist Mono', monospace",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        marginBottom: 6,
                    }}>
                        Company Name
                    </label>
                    <Input
                        value={config.companyName}
                        onChange={v => onChange({ ...config, companyName: v })}
                        placeholder="Acme Corp"
                    />
                    {!isConnected && auth.status !== "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Appears in email headers and templates
                        </p>
                    )}
                    {auth.status === "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                            ⚠ {auth.error}
                        </p>
                    )}
                </div>

                <div className="mt-5">
                    <label style={{
                        display: "block", fontSize: 11, fontWeight: 600,
                        color: auth.status === "error" ? "#f87171" : "#6b7280",
                        fontFamily: "'Geist Mono', monospace",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        marginBottom: 6,
                    }}>
                        From Address
                    </label>
                    <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #1f1f1f" }}>
                        <input
                            value={config.fromAlias}
                            onChange={e => onChange({ ...config, fromAlias: e.target.value })}
                            placeholder="recruiting"
                            style={{
                                flex: 1, background: "#111", border: "none",
                                padding: "9px 12px", color: "#e5e7eb", fontSize: 13,
                                fontFamily: "'Geist Mono', monospace", outline: "none",
                            }}
                        />
                        <div style={{
                            padding: "9px 10px", background: "#0d0d0d",
                            color: "#374151", fontSize: 13,
                            fontFamily: "'Geist Mono', monospace",
                            borderLeft: "1px solid #1f1f1f",
                            display: "flex", alignItems: "center",
                        }}>@</div>
                        <select
                            value={config.fromDomain}
                            onChange={e => onChange({ ...config, fromDomain: e.target.value })}
                            disabled={domainsLoading || domains.length === 0}
                            style={{
                                background: "#0d0d0d", border: "none",
                                borderLeft: "1px solid #1f1f1f",
                                color: domains.length > 0 ? "#e5e7eb" : "#374151",
                                padding: "9px 12px", fontSize: 13,
                                fontFamily: "'Geist Mono', monospace",
                                outline: "none", cursor: domains.length > 0 ? "pointer" : "not-allowed",
                                minWidth: 160,
                            }}
                        >
                            {domainsLoading && <option>Loading…</option>}
                            {!domainsLoading && domains.length === 0 && <option value="">No verified domains</option>}
                            {domains.map(d => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    {config.fromAlias && config.fromDomain && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#10b981", fontFamily: "monospace" }}>
                            → {config.companyName || "Your Company"} &lt;{config.fromAlias}@{config.fromDomain}&gt;
                        </p>
                    )}

                    {!isConnected && auth.status !== "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            {domains.length > 0 ? "Must use a verified Resend domain" : "Connect API key to load verified domains"}
                        </p>
                    )}
                    {auth.status === "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                            ⚠ {auth.error}
                        </p>
                    )}
                </div>
            </div>

            <Separator />

            <div className="p-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="mt-5">
                    <label style={{
                        display: "block", fontSize: 11, fontWeight: 600,
                        color: auth.status === "error" ? "#f87171" : "#6b7280",
                        fontFamily: "'Geist Mono', monospace",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        marginBottom: 6,
                    }}>
                        Hiring Manager Email
                    </label>
                    <Input
                        value={config.hiringManagerEmail}
                        onChange={v => onChange({ ...config, hiringManagerEmail: v })}
                        placeholder="manager@acme.com"
                        type="email"

                    />
                    {!isConnected && auth.status !== "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Receives internal stage transition emails
                        </p>
                    )}
                    {auth.status === "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                            ⚠ {auth.error}
                        </p>
                    )}
                </div>

                <div className="mt-5">
                    <label style={{
                        display: "block", fontSize: 11, fontWeight: 600,
                        color: auth.status === "error" ? "#f87171" : "#6b7280",
                        fontFamily: "'Geist Mono', monospace",
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        marginBottom: 6,
                    }}>
                        Recruiter Email
                    </label>
                    <Input
                        value={config.recruiterEmail}
                        onChange={v => onChange({ ...config, recruiterEmail: v })}
                        placeholder="recruiter@acme.com"
                        type="email"

                    />
                    {!isConnected && auth.status !== "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Receives internal score reports
                        </p>
                    )}
                    {auth.status === "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                            ⚠ {auth.error}
                        </p>
                    )}
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
                    Offer Signing URL
                </label>
                <Input
                    value={config.offerSigningUrl}
                    onChange={v => onChange({ ...config, offerSigningUrl: v })}
                    placeholder="https://app.docusign.com/sign/…"

                />
                {!isConnected && auth.status !== "error" && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                        Optional — added as a CTA button in offer letter emails (DocuSign, PandaDoc, etc.)
                    </p>
                )}
                {auth.status === "error" && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                        ⚠ {auth.error}
                    </p>
                )}
            </div>
        </section>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Integration toggles
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
        score_updated: { color: "#10b981", bg: "#0d1a14" },
    };

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="px-5 py-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Active Integrations
                </div>

                <div className="text-[11px] mt-0.5" >
                    Toggle which email automations fire. Individual integrations can also be controlled per pipeline stage.
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {intergrations?.map((intg, i) => {
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
                                    <Badge color={tc.color} style={{ backgroundColor: tc.bg }}>{trigger}</Badge>
                                    <Badge className="text-[]" color="#4b5563" bg="#0a0a0a">→ {intg.to}</Badge>
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
