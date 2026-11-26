"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import type { OrgPluginSettings, PluginAuthState } from "@/types";
import { pluginRegistry } from "@/lib/plugin-registry";
import { Badge } from "@/components/ui/badge";
import { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { ConfigProps, mask_key_for_display } from "./shared/types";
import ApiKeySection from "./shared/api-key-section";
import { verifyResend } from "@/server/actions/stage_actions";
import { listResendDomains } from "@/server/actions/plugin-actions";


const ResendConfig = ({ pluginId, onSave, settings }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("resend");
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
    // A stored (masked) key means the plugin is configured even though
    // nothing was verified this session — config can still be saved.
    const maskedKey = mask_key_for_display(settings?.credentials?.apiKey);
    const hasSavedKey = Boolean(maskedKey);
    const displayAuth = connectError ? { status: "error" as const, error: connectError } : auth;
    const [domains, setDomains] = useState<{ name: string; status: string }[]>([]);
    const [domainsLoading, setDomainsLoading] = useState(false);
    const [domainsError, setDomainsError] = useState<string | null>(null);
    // Validation error for the From-domain text input (shown under it).
    const [domainError, setDomainError] = useState<string | null>(null);

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
        // NOTE: the stored API key is intentionally NOT hydrated into
        // apiKey state — settings carries only a masked value, and a masked
        // value must never be treated as (or re-saved as) a key.
        // Hydrate the sender config from stored settings so saving doesn't
        // wipe values the user didn't touch this session.
        const stored = settings?.config;
        if (stored) {
            const fromAddress = typeof stored.fromAddress === "string" ? stored.fromAddress : "";
            const [alias, domain] = fromAddress.includes("@") ? fromAddress.split("@") : ["", ""];
            setConfig((prev) => ({
                ...prev,
                companyName: typeof stored.companyName === "string" ? stored.companyName : prev.companyName,
                fromAlias: alias || prev.fromAlias,
                fromDomain: domain || prev.fromDomain,
                hiringManagerEmail: typeof stored.hiringManagerEmail === "string" ? stored.hiringManagerEmail : prev.hiringManagerEmail,
                recruiterEmail: typeof stored.recruiterEmail === "string" ? stored.recruiterEmail : prev.recruiterEmail,
                offerSigningUrl: typeof stored.offerSigningUrl === "string" ? stored.offerSigningUrl : prev.offerSigningUrl,
            }));
        }
    }, [settings]);

    const handleConnect = async (key?: string) => {
        // The key comes from ApiKeySection — the parent's apiKey state is
        // still stale at click time (setState hasn't re-rendered yet).
        const apiKeyToUse = (key ?? apiKey).trim();
        if (!apiKeyToUse) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — no badge change yet.
            const check = await verifyResend(apiKeyToUse);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for a key that isn't stored.
            await onSave({ ...settings, active: true, credentials: { apiKey: apiKeyToUse } });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked key client-side.
            await authenticate("resend", { apiKey: apiKeyToUse });
            setApiKey("");
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Resend");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the key.
            await onSave({ ...settings, active: false, credentials: {} });
            setDomains([]);
            setDomainsError(null);
            setApiKey("");
            await pluginRegistry.getProvider("resend")?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Resend");
        }
    };

    // ── Verified domains (H14) ───────────────────────────────────────────────
    // Real list from the server action (GET /domains with the org's stored
    // key, decrypted server-side). Loads once a key is connected or saved;
    // a sending-only key can't list domains, so that failure leaves the
    // domain field as a text input instead of a dead select.
    const loadDomains = useCallback(async () => {
        setDomainsLoading(true);
        setDomainsError(null);
        try {
            const result = await listResendDomains();
            if (!result.success) throw new Error(result.message);
            setDomains(result.domains ?? []);
        } catch (e) {
            setDomains([]);
            setDomainsError((e as Error).message || "Failed to load verified domains");
        } finally {
            setDomainsLoading(false);
        }
    }, []);

    const domainsLoadedFor = useRef<string | null>(null);
    useEffect(() => {
        const key = maskedKey ?? "";
        if ((isConnected || key) && domainsLoadedFor.current !== key) {
            domainsLoadedFor.current = key;
            void loadDomains();
        }
        if (!isConnected && !key) {
            domainsLoadedFor.current = null;
            setDomains([]);
            setDomainsError(null);
        }
    }, [isConnected, maskedKey, loadDomains]);

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setDomainError(null);
        try {
            // A typed domain must look like a domain; the select only ever
            // offers verified ones, but the text fallback (sending-only
            // keys, load failures, no verified domains) is user-typed.
            const domain = config.fromDomain.trim();
            if (domain && !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
                setDomainError("Enter a valid domain, e.g. mail.acme.com");
                return;
            }
            // Preserve the stored From address when the form doesn't
            // supply a complete one: the server replaces config wholesale,
            // so omitting fromAddress here used to silently wipe it.
            const storedFromAddress = typeof settings?.config?.fromAddress === "string"
                ? settings.config.fromAddress
                : "";
            const fromAddress = config.fromAlias.trim() && domain
                ? `${config.fromAlias.trim()}@${domain}`
                : storedFromAddress || undefined;
            // Only send credentials when the user typed a NEW key — otherwise
            // omit them and the server preserves the stored (encrypted) key.
            const next_settings: OrgPluginSettings = {
                ...settings,
                active: true,
                config: {
                    ...config,
                    ...(fromAddress ? { fromAddress } : {}),
                },
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
            console.error("Failed to save Resend settings", e);
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
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-card">
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

                {/* Save */}
                <Button
                    onClick={handleSave}
                    disabled={(!isConnected && !hasSavedKey) || saving}
                    className="rounded-md"
                    style={{
                        padding: "7px 18px", borderRadius: 6,
                        background: saved ? "#0d1a14" : (isConnected || hasSavedKey ? "#fff" : "#111"),
                        border: saved ? "1px solid #10b981" : "none",
                        color: saved ? "#10b981" : (isConnected || hasSavedKey ? "#000" : "#374151"),
                        fontSize: 12, fontWeight: 600,
                        cursor: (isConnected || hasSavedKey) ? "pointer" : "not-allowed",
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
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Configure transactional email for your hiring pipeline — candidate confirmations, stage updates, offer letters, and internal reports.
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

                    <SenderSection
                        config={config}
                        onChange={setConfig}
                        domains={domains}
                        auth={displayAuth}
                        domainsLoading={domainsLoading}
                        domainsError={domainsError}
                        hasSavedKey={hasSavedKey}
                        domainError={domainError}
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
    )
};

export default ResendConfig;



// ─────────────────────────────────────────────────────────────────────────────
// Sender config
// ─────────────────────────────────────────────────────────────────────────────
type SenderConfig = {
    companyName: string;
    fromAlias: string;
    fromDomain: string;
    hiringManagerEmail: string;
    recruiterEmail: string;
    offerSigningUrl: string;
};

type SenderSectionProps = {
    config: SenderConfig;
    onChange: (config: SenderConfig) => void;
    domains: { name: string; status: string }[];
    domainsLoading: boolean;
    domainsError: string | null;
    hasSavedKey: boolean;
    domainError: string | null;
    auth: PluginAuthState;
};

const SenderSection = ({ config, onChange, domains, domainsLoading, domainsError, hasSavedKey, domainError, auth }: SenderSectionProps) => {
    const isConnected = auth.status === "authenticated";
    const hasKey = isConnected || hasSavedKey;
    // Only verified domains may send. Keep a stored domain selectable even
    // if it no longer appears in the verified list, so a save can't strand it.
    const verifiedDomains = domains.filter(d => d.status === "verified");
    const domainOptions = config.fromDomain && !verifiedDomains.some(d => d.name === config.fromDomain)
        ? [...verifiedDomains, { name: config.fromDomain, status: "stored" }]
        : verifiedDomains;
    // No verified domains to pick from (sending-only key, load failure, or
    // none verified): fall back to a validated text input instead of a
    // permanently disabled select.
    const useDomainInput = domainOptions.length === 0 && !domainsLoading;

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
                        onChange={e => onChange({ ...config, companyName: e.target.value })}
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
                        {useDomainInput ? (
                            <input
                                value={config.fromDomain}
                                onChange={e => onChange({ ...config, fromDomain: e.target.value })}
                                placeholder="yourdomain.com"
                                disabled={!hasKey}
                                style={{
                                    flex: 1, background: "#0d0d0d", border: "none",
                                    borderLeft: "1px solid #1f1f1f",
                                    color: "#e5e7eb", padding: "9px 12px", fontSize: 13,
                                    fontFamily: "'Geist Mono', monospace",
                                    outline: "none", minWidth: 160,
                                }}
                            />
                        ) : (
                            <select
                                value={config.fromDomain}
                                onChange={e => onChange({ ...config, fromDomain: e.target.value })}
                                disabled={domainsLoading || domainOptions.length === 0}
                                style={{
                                    background: "#0d0d0d", border: "none",
                                    borderLeft: "1px solid #1f1f1f",
                                    color: domainOptions.length > 0 ? "#e5e7eb" : "#374151",
                                    padding: "9px 12px", fontSize: 13,
                                    fontFamily: "'Geist Mono', monospace",
                                    outline: "none", cursor: domainOptions.length > 0 ? "pointer" : "not-allowed",
                                    minWidth: 160,
                                }}
                            >
                                {domainsLoading && <option>Loading…</option>}
                                {!domainsLoading && domainOptions.length === 0 && <option value="">No verified domains</option>}
                                {domainOptions.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}{d.status === "stored" ? " (unverified)" : ""}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {config.fromAlias && config.fromDomain && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#10b981", fontFamily: "monospace" }}>
                            → {config.companyName || "Your Company"} &lt;{config.fromAlias}@{config.fromDomain}&gt;
                        </p>
                    )}

                    {domainError && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                            ⚠ {domainError}
                        </p>
                    )}
                    {!hasKey && auth.status !== "error" && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Connect an API key to load verified domains
                        </p>
                    )}
                    {hasKey && domainsLoading && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Loading verified domains…
                        </p>
                    )}
                    {hasKey && !domainsLoading && domainsError && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f59e0b", fontFamily: "monospace" }}>
                            ⚠ {domainsError}
                        </p>
                    )}
                    {hasKey && !domainsLoading && !domainsError && domainOptions.length === 0 && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            No verified domains in this Resend account — add one in Resend, or type the domain
                        </p>
                    )}
                    {hasKey && !domainsLoading && !domainsError && domainOptions.length > 0 && (
                        <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                            Must use a verified Resend domain
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
                        onChange={e => onChange({ ...config, hiringManagerEmail: e.target.value })}
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
                        onChange={e => onChange({ ...config, recruiterEmail: e.target.value })}
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
                    onChange={e => onChange({ ...config, offerSigningUrl: e.target.value })}
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
