"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Twilio SMS settings.
//
// Account SID + Auth Token per org (encrypted at rest, like every other
// plugin secret) + one sender (From) number the account owns. Connect =
// verify against the real Twilio API (GET /Accounts/{sid}) and report
// Twilio's real answer — a bad SID/token fails loudly. "Send test SMS"
// sends a REAL text through the saved credentials to a number the admin
// types, and reports Twilio's real result (SID + queued status, or
// Twilio's error — a trial account texting an unverified number fails
// here with Twilio's 21211, exactly as a real send would).
//
// SMS never fires from this page. It fires two ways, both consent-gated:
//   • Automation rules — action "Send SMS" (send_sms), candidate only.
//   • The manual card on the application page.
// A candidate with no consent on file is never texted by either path.
// ─────────────────────────────────────────────────────────────────────────────
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { testTwilioSms, verifyTwilio } from "@/server/actions/twilio-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PluginAuthState } from "@/types";
import { ConfigProps, mask_key_for_display } from "./shared/types";
import { useEffect, useMemo, useState } from "react";

const TwilioConfig = ({ settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState("twilio");
    const isConnected = auth.status === "authenticated";

    // accountSid/authToken hold ONLY values the user typed this session
    // (pending save). The stored credentials are never sent to the
    // browser — settings carries masked values (•••• + last 4), shown
    // for display only.
    const [accountSid, setAccountSid] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [reentering, setReentering] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Connect/test failures surface inline (via the error auth below)
    // with the server's real message — never a generic alert.
    const [connectError, setConnectError] = useState<string | null>(null);
    const maskedSid = mask_key_for_display(settings?.credentials?.accountSid);
    const maskedToken = mask_key_for_display(settings?.credentials?.authToken);
    // Stored (masked) credentials mean the plugin is configured even
    // though nothing was verified this session — config can still be saved.
    const hasSavedCreds = Boolean(maskedSid && maskedToken);
    const displayAuth = connectError ? { status: "error" as const, error: connectError } : auth;

    // Test-send result for the SAVED credentials (separate from connect errors).
    const [testState, setTestState] = useState<{ ok: boolean; message: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState("");

    // Sender number — hydrated from stored settings so saving doesn't
    // wipe a value the user didn't touch this session.
    const [fromNumber, setFromNumber] = useState(
        typeof settings?.config?.fromNumber === "string" ? settings.config.fromNumber : ""
    );
    useEffect(() => {
        const stored = settings?.config?.fromNumber;
        if (typeof stored === "string") setFromNumber(stored);
    }, [settings]);

    // ── Dirty tracking ────────────────────────────────────────────────────
    // Save is enabled whenever there are unsaved edits — typed
    // credentials, a sender-number edit — not only once connected/saved,
    // and a beforeunload guard warns before navigating away with edits.
    const initialFromNumber = useMemo(
        () => (typeof settings?.config?.fromNumber === "string" ? settings.config.fromNumber : ""),
        [settings],
    );
    const isDirty =
        accountSid.trim() !== "" ||
        authToken.trim() !== "" ||
        fromNumber !== initialFromNumber;

    useEffect(() => {
        if (!isDirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", guard);
        return () => window.removeEventListener("beforeunload", guard);
    }, [isDirty]);

    const handleConnect = async () => {
        const sid = accountSid.trim();
        const token = authToken.trim();
        if (!sid || !token) return;
        setConnectError(null);
        setTestState(null);
        try {
            // 1. Verify ONLY — GET /Accounts/{sid} and report Twilio's
            // real answer. No badge change yet.
            const check = await verifyTwilio(sid, token);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for credentials that aren't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { accountSid: sid, authToken: token },
                config: { ...settings.config, ...(fromNumber.trim() ? { fromNumber: fromNumber.trim() } : {}) },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked credentials client-side.
            await authenticate("twilio", { accountSid: sid, authToken: token });
            setAccountSid("");
            setAuthToken("");
            setReentering(false);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Twilio");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        setTestState(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the credentials.
            await onSave({ ...settings, active: false, credentials: {} });
            setAccountSid("");
            setAuthToken("");
            setReentering(false);
            await pluginRegistry.getProvider("twilio")?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Twilio");
        }
    };

    // Send a REAL test SMS through the SAVED credentials (decrypted
    // server-side) to the number typed below.
    const handleTestSaved = async () => {
        if (!testPhone.trim()) return;
        setTesting(true);
        setTestState(null);
        try {
            const result = await testTwilioSms(testPhone.trim());
            setTestState({ ok: result.success, message: result.message });
        } catch (e) {
            setTestState({ ok: false, message: (e as Error).message || "Failed to send test SMS" });
        } finally {
            setTesting(false);
        }
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            // Only send credentials when the user typed NEW ones —
            // otherwise omit them and the server preserves the stored
            // (encrypted) pair. (Sending masked display values back
            // would be useless; the server also refuses to overwrite
            // stored credentials with a mask.)
            const next_settings: typeof settings = {
                ...settings,
                active: true,
                config: { ...settings.config, ...(fromNumber.trim() ? { fromNumber: fromNumber.trim() } : {}) },
            };
            if (accountSid.trim() && authToken.trim()) {
                next_settings.credentials = { accountSid: accountSid.trim(), authToken: authToken.trim() };
            } else {
                delete next_settings.credentials;
            }
            await onSave(next_settings);
            setAccountSid("");
            setAuthToken("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error("Failed to save Twilio settings", e);
        } finally {
            setSaving(false);
        }
    };

    const showingStoredCreds = (isConnected || hasSavedCreds) && !reentering;

    return (
        <div className="relative">
            {/* Top bar */}
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                {/* Twilio wordmark */}
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-card">
                        <span style={{ fontSize: 16 }}>💬</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Twilio</div>
                        <div className="text-xs text-background/20">
                            Twilio SMS
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* Status pill */}
                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedCreds ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedCreds ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedCreds ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full  bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedCreds ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedCreds ? "Saved" : "Not connected"}
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
                            Twilio Settings
                        </h1>
                        <p className="mt-1 text-[13px] text-muted-foreground leading-tight">
                            Text candidates via Twilio — automation rules and the application page send SMS through this account, only to candidates with recorded consent.
                        </p>
                    </div>

                    {/* Sections */}
                    <CredentialsSection
                        accountSid={accountSid}
                        authToken={authToken}
                        maskedSid={maskedSid}
                        maskedToken={maskedToken}
                        showingStoredCreds={showingStoredCreds}
                        onAccountSidChange={setAccountSid}
                        onAuthTokenChange={setAuthToken}
                        onReenter={() => setReentering(true)}
                        auth={displayAuth}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        hasSavedCreds={hasSavedCreds}
                    />

                    <SenderSection
                        fromNumber={fromNumber}
                        onFromNumberChange={setFromNumber}
                    />

                    {/* Test SMS through the SAVED credentials */}
                    {hasSavedCreds && (
                        <section className="bg-card overflow-hidden rounded-md mb-3 border">
                            <div className="p-4 border-b bg-transparent">
                                <div className="text-[13px] uppercase tracking-wide font-bold">
                                    Test SMS
                                </div>
                                <div className="text-[11px] mt-0.5">
                                    Sends a real text through the saved Twilio credentials to a number you type — use your own phone.
                                </div>
                            </div>
                            <div className="my-5 px-4">
                                <div style={{ display: "flex", gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <Input
                                            value={testPhone}
                                            onChange={(v) => setTestPhone(v.target.value)}
                                            placeholder="+13055550100"
                                        />
                                    </div>
                                    <Button variant="outline" onClick={handleTestSaved} disabled={!testPhone.trim() || testing}>
                                        {testing ? "Sending…" : "Send test SMS"}
                                    </Button>
                                </div>
                                {testState && (
                                    <p style={{ margin: "8px 0 0", fontSize: 11, fontFamily: "monospace", color: testState.ok ? "#10b981" : "#f87171" }}>
                                        {testState.ok ? "✓ " : "⚠ "}{testState.message}
                                    </p>
                                )}
                                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                                    Trial accounts can only text numbers verified in the Twilio console — an unverified number fails with Twilio&apos;s real error.
                                </p>
                            </div>
                        </section>
                    )}

                    {/* How SMS sends — no dispatch integrations */}
                    <section className="bg-card overflow-hidden rounded-md mb-3 border">
                        <div className="p-4 border-b bg-transparent">
                            <div className="text-[13px] uppercase tracking-wide font-bold">
                                How SMS sends
                            </div>
                        </div>
                        <div className="my-5 px-4" style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                            <p style={{ margin: 0 }}>
                                • <b>Automation:</b> add a rule with the &ldquo;Send SMS&rdquo; action — it texts the candidate (never staff) when the rule fires.
                            </p>
                            <p style={{ margin: "6px 0 0" }}>
                                • <b>Manual:</b> the Twilio SMS card on an application page sends one message to that candidate.
                            </p>
                            <p style={{ margin: "6px 0 0" }}>
                                • <b>Consent:</b> neither path texts a candidate without a recorded consent — the send fails visibly instead of skipping silently. Record consent on the application page.
                            </p>
                            <p style={{ margin: "6px 0 0" }}>
                                • <b>Delivery:</b> Twilio reports &ldquo;queued&rdquo; when the message is accepted; delivery itself is asynchronous. Failed sends are recorded in the activity log.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TwilioConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Credentials section
// ─────────────────────────────────────────────────────────────────────────────
type CredentialsSectionProps = {
    accountSid: string;
    authToken: string;
    maskedSid?: string;
    maskedToken?: string;
    showingStoredCreds: boolean;
    onAccountSidChange: (v: string) => void;
    onAuthTokenChange: (v: string) => void;
    onReenter: () => void;
    auth: PluginAuthState;
    onConnect: () => void;
    onDisconnect: () => void;
    hasSavedCreds: boolean;
};

const CredentialsSection = ({
    accountSid,
    authToken,
    maskedSid,
    maskedToken,
    showingStoredCreds,
    onAccountSidChange,
    onAuthTokenChange,
    onReenter,
    auth,
    onConnect,
    onDisconnect,
    hasSavedCreds,
}: CredentialsSectionProps) => {
    const isConnected = auth.status === "authenticated";
    const isLoading = auth.status === "authenticating";

    const statusText = isConnected ? "Connected · credentials verified this session" :
        isLoading ? "Verifying credentials…" :
            auth.status === "error" ? "Connection failed" :
                hasSavedCreds ? "Saved · credentials stored, not verified this session" :
                    "Not connected";

    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: 11, fontWeight: 600,
        color: "#6b7280",
        fontFamily: "'Geist Mono', monospace",
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 6,
    };

    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Twilio Credentials
                </div>

                <div className="text-[11px] mt-0.5" >
                    Your Account SID and Auth Token are encrypted at rest (AES-256-GCM) and never sent back to the browser — only the last 4 characters are shown
                </div>
            </div>

            <div className="my-5 px-4">
                <label style={{ ...labelStyle, color: auth.status === "error" ? "#f87171" : "#6b7280" }}>
                    Account SID
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            value={showingStoredCreds ? (maskedSid ?? "••••••••") : accountSid}
                            onChange={(v) => onAccountSidChange(v.target.value)}
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            disabled={showingStoredCreds}
                        />
                    </div>
                </div>
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    Find it in the Twilio console dashboard (Account SID starts with AC).
                </p>
            </div>

            <div className="my-5 px-4">
                <label style={{ ...labelStyle, color: auth.status === "error" ? "#f87171" : "#6b7280" }}>
                    Auth Token
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            type="password"
                            value={showingStoredCreds ? (maskedToken ?? "••••••••") : authToken}
                            onChange={(v) => onAuthTokenChange(v.target.value)}
                            placeholder="Your Auth Token (click the eye icon in the Twilio console to reveal it)"
                            disabled={showingStoredCreds}
                        />
                    </div>
                    {showingStoredCreds ? (
                        <Button variant="outline" onClick={onReenter}>
                            Replace credentials
                        </Button>
                    ) : (
                        <Button
                            onClick={onConnect}
                            disabled={!accountSid.trim() || !authToken.trim() || isLoading}
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
                    Status: {statusText}
                </p>
                {auth.status === "error" && auth.error && (
                    <p style={{ margin: "5px 0 0", fontSize: 11, color: "#f87171", fontFamily: "monospace" }}>
                        ⚠ {auth.error}
                    </p>
                )}
            </div>
        </section>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sender number section
// ─────────────────────────────────────────────────────────────────────────────
type SenderSectionProps = {
    fromNumber: string;
    onFromNumberChange: (v: string) => void;
};

const SenderSection = ({ fromNumber, onFromNumberChange }: SenderSectionProps) => {
    return (
        <section className="bg-card overflow-hidden rounded-md mb-3 border">
            <div className="p-4 border-b bg-transparent">
                <div className="text-[13px] uppercase tracking-wide font-bold">
                    Sender Number
                </div>
                <div className="text-[11px] mt-0.5">
                    The Twilio phone number candidates see as the sender. It must be a number this Twilio account owns.
                </div>
            </div>
            <div className="my-5 px-4">
                <label style={{
                    display: "block", fontSize: 11, fontWeight: 600,
                    color: "#6b7280",
                    fontFamily: "'Geist Mono', monospace",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    marginBottom: 6,
                }}>
                    From number (E.164)
                </label>
                <Input
                    value={fromNumber}
                    onChange={e => onFromNumberChange(e.target.value)}
                    placeholder="+13055550100"
                />
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#374151", fontFamily: "monospace" }}>
                    E.164 format with country code, e.g. +13055550100. Buy a number in the Twilio console if the account has none — without it, no SMS can send.
                </p>
            </div>
        </section>
    );
};
