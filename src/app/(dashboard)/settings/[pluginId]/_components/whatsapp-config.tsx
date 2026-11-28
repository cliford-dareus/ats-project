'use client';

// WhatsApp Business config — Twilio Account SID + Auth Token, sender
// number, default approved template.
//
// Honest states (same masked-key rule as Google/Resend/Calendly/Checkr):
//   • "Connected · Twilio account verified this session" — this session's
//     SID/token were just verified against GET /Accounts/{sid}.json.
//   • "Saved · credentials stored, not verified this session" — masked
//     credentials are stored; nothing was verified this session.
//   • "Not connected" — no credentials stored.
//
// What verification does and does NOT prove:
//   • It proves the Twilio ACCOUNT (SID/token pair + active status).
//   • It does NOT prove the From number is a registered WhatsApp sender
//     — Twilio has no read-only check for that. A wrong or unregistered
//     sender fails at SEND time with Twilio's real error, and the UI
//     says so instead of claiming the sender is verified.
//
// What WhatsApp does here (stated in the UI, not just in code):
//   • Sends are TEMPLATE-ONLY (approved Content Template SID +
//     variables). Applico has no inbound WhatsApp webhook, so it can
//     never know whether the 24-hour session window is open — and a
//     free-form message outside the window fails with Twilio error
//     63016. There is deliberately no free-form path in this build.
//   • Sending is a manual, consent-gated recruiter action on the
//     application page. Nothing auto-fires a WhatsApp message, and no
//     message is ever sent without consent on file for that candidate.
//   • Delivery status is Twilio's verbatim status (queued / sent /
//     delivered / undelivered / failed), refreshed on demand from the
//     application card. No polling, no webhook receiver in this build.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { WHATSAPP_BRAND_COLOR } from "@/plugins/providers/whatsapp";
import { verifyWhatsapp } from "@/server/actions/whatsapp-actions";
import { ConfigProps } from "./shared/types";

const SID_PATTERN = /^AC[0-9a-f]{32}$/i;
const CONTENT_SID_PATTERN = /^HX[0-9a-f]{32}$/i;

const WhatsappConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const maskedSid =
        typeof settings?.credentials?.accountSid === "string"
            ? settings.credentials.accountSid
            : "";
    const maskedToken =
        typeof settings?.credentials?.authToken === "string"
            ? settings.credentials.authToken
            : "";
    const hasSavedCredentials = !!maskedSid || !!maskedToken;
    const isConnected = auth.status === "authenticated";
    const savedFromNumber =
        typeof settings?.config?.fromNumber === "string" ? settings.config.fromNumber : "";
    const savedTemplateSid =
        typeof settings?.config?.defaultTemplateSid === "string"
            ? settings.config.defaultTemplateSid
            : "";

    const [accountSid, setAccountSid] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [showToken, setShowToken] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [saved, setSaved] = useState(false);

    const [fromNumber, setFromNumber] = useState(savedFromNumber);
    const [templateSid, setTemplateSid] = useState(savedTemplateSid);
    const [configError, setConfigError] = useState<string | null>(null);
    const [configSaved, setConfigSaved] = useState(false);

    useEffect(() => {
        setFromNumber(savedFromNumber);
    }, [savedFromNumber]);
    useEffect(() => {
        setTemplateSid(savedTemplateSid);
    }, [savedTemplateSid]);

    const handleConnect = async () => {
        const sid = accountSid.trim();
        const token = authToken.trim();
        if (!sid || !token) return;
        if (!SID_PATTERN.test(sid)) {
            setConnectError("Account SID should be “AC” followed by 32 characters — copy it from the Twilio Console dashboard.");
            return;
        }
        setConnectError(null);
        setConnecting(true);
        try {
            // 1. Verify ONLY — GET /Accounts/{sid}.json. No badge change yet.
            const check = await verifyWhatsapp(sid, token);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never
            // claimed "Connected" for credentials that aren't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { accountSid: sid, authToken: token },
                config: {
                    ...(settings.config ?? {}),
                    fromNumber: fromNumber.trim(),
                    defaultTemplateSid: templateSid.trim(),
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked credentials client-side.
            await authenticate(pluginId, { accountSid: sid, authToken: token });
            setAccountSid("");
            setAuthToken("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect WhatsApp");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the token.
            await onSave({
                ...settings,
                active: false,
                credentials: {},
                config: {
                    ...(settings.config ?? {}),
                    fromNumber: "",
                    defaultTemplateSid: "",
                },
            });
            setAccountSid("");
            setAuthToken("");
            setFromNumber("");
            setTemplateSid("");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect WhatsApp");
        }
    };

    const handleSaveConfig = async () => {
        const from = fromNumber.trim();
        const sid = templateSid.trim();
        if (sid && !CONTENT_SID_PATTERN.test(sid)) {
            setConfigError("Template Content SID should be “HX” followed by 32 characters — copy it from Twilio Console → Messaging → Content Template Builder.");
            return;
        }
        setConfigError(null);
        try {
            // Config-only save: the masked credentials echo preserves the
            // stored SID/token server-side (see plugin-encryption).
            await onSave({
                ...settings,
                config: { ...(settings.config ?? {}), fromNumber: from, defaultTemplateSid: sid },
            });
            setConfigSaved(true);
            setTimeout(() => setConfigSaved(false), 2500);
        } catch (e) {
            setConfigError((e as Error).message || "Failed to save WhatsApp settings");
        }
    };

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: WHATSAPP_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">W</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">WhatsApp Business</div>
                        <div className="text-xs text-background/20">
                            WhatsApp via Twilio · template-only
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedCredentials ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedCredentials ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedCredentials ? "Saved" : "Not connected"}
                </div>

                {saved && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#10b981" }}>
                        ✓ Saved
                    </span>
                )}
            </div>

            {connectError && (
                <div role="alert" className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    ⚠ {connectError}
                </div>
            )}

            <div className="rounded-md border p-6 space-y-2">
                <h2 className="text-lg font-semibold">What WhatsApp does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When WhatsApp is connected, a recruiter can send a candidate an approved WhatsApp
                    template from the application page — a deliberate action, never automatic. The
                    message goes out through Twilio&apos;s WhatsApp API, and the card shows Twilio&apos;s
                    real delivery status for it.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Template-only: only approved templates are ever sent. Applico has no inbound WhatsApp webhook, so it cannot know whether the 24-hour session window is open — free-form messages outside the window fail with Twilio error 63016, so there is no free-form path here.</li>
                    <li>No message is ever sent without WhatsApp consent on file for that candidate. Consent is recorded on the application card (who confirmed it and when); it is separate from any SMS consent and is never inferred from a phone number alone.</li>
                    <li>No automation rule fires a WhatsApp message. Sending is always a recruiter&apos;s deliberate action.</li>
                    <li>No live polling and no webhook receiver in this build — the application card shows Twilio&apos;s status as last refreshed from Twilio.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-2">
                <h2 className="text-lg font-semibold">Before you connect — what the org must do in Twilio first</h2>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><strong className="text-foreground">Register a WhatsApp sender</strong> in Twilio Console → Messaging → Senders → WhatsApp (your business number, verified by Meta). The From number below must be that registered sender — connecting here does not verify the sender, and an unregistered number fails at send time with Twilio&apos;s real error.</li>
                    <li><strong className="text-foreground">Create and get approval for your templates</strong> in Twilio Console → Messaging → Content Template Builder. Meta must approve each template before it can deliver; an unapproved template is rejected by Twilio even though its Content SID exists.</li>
                    <li><strong className="text-foreground">Trial accounts</strong> can only message numbers you have verified in the Twilio Console. Upgrade the Twilio account to send to any candidate.</li>
                    <li>To test without a registered sender, use the Twilio WhatsApp sandbox (<code className="font-mono text-xs">whatsapp:+14155238886</code>) — the candidate must first join it by sending the sandbox join code from their phone.</li>
                    <li>WhatsApp messages are billable per conversation on Twilio — check Twilio&apos;s WhatsApp pricing before sending at volume.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Twilio credentials</h2>
                <p className="text-sm text-muted-foreground">
                    In the Twilio Console dashboard: your Account SID and Auth Token. If this org also
                    uses the Twilio SMS plugin, it is the same Twilio account — paste the same SID and
                    token here; they are stored separately under WhatsApp, encrypted the same way.
                </p>
                {hasSavedCredentials && !isConnected && (
                    <p className="text-sm text-amber-600">
                        Saved · credentials stored, not verified this session. Stored Account SID:{" "}
                        <code className="font-mono text-xs">{maskedSid || "••••••••"}</code>
                        {maskedToken ? " · Auth Token stored" : ""}
                    </p>
                )}
                {isConnected && (
                    <p className="text-sm text-emerald-600">
                        Connected · Twilio account verified this session.
                    </p>
                )}
                <div className="space-y-2">
                    <Label htmlFor="whatsapp-account-sid">Account SID</Label>
                    <Input
                        id="whatsapp-account-sid"
                        value={accountSid}
                        onChange={(e) => setAccountSid(e.target.value)}
                        placeholder="AC… (32 characters after AC)"
                        className="font-mono"
                        autoComplete="off"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="whatsapp-auth-token">Auth Token</Label>
                    <div className="flex gap-2">
                        <Input
                            id="whatsapp-auth-token"
                            type={showToken ? "text" : "password"}
                            value={authToken}
                            onChange={(e) => setAuthToken(e.target.value)}
                            placeholder="Your Twilio Auth Token"
                            className="font-mono"
                            autoComplete="off"
                        />
                        <Button type="button" variant="outline" onClick={() => setShowToken((v) => !v)}>
                            {showToken ? "Hide" : "Show"}
                        </Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isConnected || hasSavedCredentials ? (
                        <Button type="button" variant="outline" onClick={handleDisconnect} disabled={connecting}>
                            Disconnect
                        </Button>
                    ) : null}
                    <Button type="button" onClick={handleConnect} disabled={!accountSid.trim() || !authToken.trim() || connecting}>
                        {connecting ? "Verifying…" : isConnected || hasSavedCredentials ? "Re-enter credentials & verify" : "Connect & verify"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Verification checks the Twilio account only (GET /Accounts). It does not verify
                    the sender number or the template — those are proven at send time by Twilio&apos;s
                    real response.
                </p>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Sender &amp; default template</h2>
                <p className="text-sm text-muted-foreground">
                    The From number must be your registered WhatsApp sender in Twilio (E.164, e.g.{" "}
                    <code className="font-mono text-xs">+15551234567</code>). The default template is
                    the approved Content Template sent from the application card unless the recruiter
                    picks another one — its Content SID starts with{" "}
                    <code className="font-mono text-xs">HX</code>.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="whatsapp-from-number">WhatsApp sender number (From)</Label>
                    <Input
                        id="whatsapp-from-number"
                        value={fromNumber}
                        onChange={(e) => setFromNumber(e.target.value)}
                        placeholder="e.g. +15551234567"
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="whatsapp-template-sid">Default template Content SID</Label>
                    <Input
                        id="whatsapp-template-sid"
                        value={templateSid}
                        onChange={(e) => setTemplateSid(e.target.value)}
                        placeholder="e.g. HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                        Find it in Twilio Console → Messaging → Content Template Builder → your
                        approved template. The template&apos;s placeholders ({"{{1}}"}, {"{{2}}"}, …)
                        are filled in on the application card when sending.
                    </p>
                </div>
                {configError && (
                    <p role="alert" className="text-sm text-destructive">{configError}</p>
                )}
                {configSaved && (
                    <p role="status" className="text-sm text-emerald-600">✓ Sender &amp; template saved</p>
                )}
                <Button type="button" onClick={handleSaveConfig}>
                    Save sender &amp; template
                </Button>
            </div>
        </div>
    );
};

export default WhatsappConfig;
