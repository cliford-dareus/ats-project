'use client';

// Zoom config — Server-to-Server OAuth credentials (Account ID, Client
// ID, Client Secret), verified live against GET /users/me.
//
// Honest states (same masked-key rule as Google/Resend/Calendly):
//   • "Connected · Zoom verified this session" — this session's
//     credentials were just verified against GET /users/me.
//   • "Saved · credentials stored, not verified this session" — masked
//     credentials are stored; nothing was verified this session.
//   • "Not connected" — no credentials stored.
//
// What Zoom does here (stated in the UI, not just in code):
//   • Creates a real Zoom meeting for a VIDEO interview from the
//     schedule modal (pick Zoom; Applico creates the meeting via the
//     Zoom Meetings API and stores the join link on the interview).
//   • Meetings are hosted by the Zoom account owner — the user who
//     created the Marketplace app — not by the individual recruiter.
//   • No Google Calendar event is created on the Zoom path, and holds
//     are not available — the meeting goes straight into Zoom.
//   • The org must create + activate a Server-to-Server OAuth app in
//     the Zoom Marketplace first. No public publish step is needed for
//     the org's own account — publishing is only for distributing the
//     app to other Zoom accounts.
//   • On a Basic (free) Zoom account, meetings with 3+ participants
//     are capped at 40 minutes — Zoom enforces that, Applico doesn't.
//   • Meetings cancelled in Zoom don't sync back; cancel from Applico.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { ZOOM_BRAND_COLOR, ZOOM_REQUIRED_SCOPES } from "@/plugins/providers/zoom";
import { verifyZoom } from "@/server/actions/plugin-actions";
import { ConfigProps } from "./shared/types";

const ZoomConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const hasSavedCredentials = !!(
        settings?.credentials?.accountId ||
        settings?.credentials?.clientId ||
        settings?.credentials?.clientSecret
    );
    const isConnected = auth.status === "authenticated";
    const savedUserName =
        typeof settings?.config?.userName === "string" ? settings.config.userName : "";
    const savedUserEmail =
        typeof settings?.config?.userEmail === "string" ? settings.config.userEmail : "";

    const [accountId, setAccountId] = useState("");
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const handleConnect = async () => {
        const account = accountId.trim();
        const client = clientId.trim();
        const secret = clientSecret.trim();
        if (!account || !client || !secret) {
            setConnectError("Account ID, Client ID, and Client Secret are all required.");
            return;
        }
        setConnectError(null);
        setConnecting(true);
        try {
            // 1. Verify ONLY — mint a token, then GET /users/me. No badge
            // change yet, and the returned user is what gets stored as
            // display config.
            const check = await verifyZoom(account, client, secret);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never claimed
            // "Connected" for credentials that aren't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { accountId: account, clientId: client, clientSecret: secret },
                config: {
                    ...(settings.config ?? {}),
                    userName: check.user?.name ?? "",
                    userEmail: check.user?.email ?? "",
                    userId: check.user?.id ?? "",
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked values client-side.
            await authenticate(pluginId, {
                accountId: account,
                clientId: client,
                clientSecret: secret,
            });
            setAccountId("");
            setClientId("");
            setClientSecret("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Zoom");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds credentials.
            await onSave({
                ...settings,
                active: false,
                credentials: {},
                config: {
                    ...(settings.config ?? {}),
                    userName: "",
                    userEmail: "",
                    userId: "",
                },
            });
            setAccountId("");
            setClientId("");
            setClientSecret("");
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Zoom");
        }
    };

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: ZOOM_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">Z</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Zoom</div>
                        <div className="text-xs text-background/20">
                            Server-to-Server OAuth · video meetings
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
                <h2 className="text-lg font-semibold">What Zoom does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When Zoom is connected, the schedule modal offers a Zoom option for VIDEO interviews:
                    Applico creates a real Zoom meeting via the Zoom Meetings API and stores the join link
                    on the interview. The meeting belongs to the connected Zoom account — interviewers you
                    pick are still recorded on the interview and emailed, but they don&apos;t host their
                    own Zoom meeting.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>No Google Calendar event is created on the Zoom path; holds are not available — the meeting goes straight into Zoom.</li>
                    <li>Meetings are hosted by the Zoom account owner (the user who created the Marketplace app), not by the recruiter who schedules.</li>
                    <li>On a Basic (free) Zoom account, meetings with 3+ participants are capped at 40 minutes — Zoom enforces that.</li>
                    <li>Meetings cancelled in Zoom don&apos;t sync back — cancel the interview from Applico so the Zoom meeting is deleted too.</li>
                </ul>
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Create a Server-to-Server OAuth app</h2>
                <p className="text-sm text-muted-foreground">
                    In Zoom: Marketplace → Develop → Build App → <strong className="text-foreground">Server-to-Server OAuth</strong> →
                    name it (e.g. “Applico”), add the scopes below, then <strong className="text-foreground">Activate</strong> it.
                    The App Credentials screen then shows the Account ID, Client ID, and Client Secret — paste all three below.
                    The Client Secret is shown only once. No public publish step is needed for your own account — publishing is only
                    for distributing the app to other Zoom accounts.
                </p>
                <div>
                    <Label>Scopes the app needs</Label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {ZOOM_REQUIRED_SCOPES.map((scope) => (
                            <Badge key={scope} variant="outline" className="font-mono text-xs">
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
                {savedUserName && (
                    <p className="text-sm text-muted-foreground">
                        Connected as <span className="font-semibold text-foreground">{savedUserName}</span>
                        {savedUserEmail ? ` (${savedUserEmail})` : ""}. Meetings are hosted by this
                        Zoom account.
                    </p>
                )}
            </div>

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Server-to-Server OAuth credentials</h2>
                {isConnected || hasSavedCredentials ? (
                    <p className="text-sm text-muted-foreground">
                        {isConnected
                            ? "Connected · Zoom verified these credentials this session."
                            : "Saved · credentials stored (masked), not verified this session. Re-enter them below to re-verify, or disconnect to remove them."}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Paste the three values from your Zoom app&apos;s App Credentials screen. They are verified
                        live against Zoom before anything is saved — bad credentials fail with Zoom&apos;s real error.
                    </p>
                )}
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="zoom-account-id">Account ID</Label>
                        <Input
                            id="zoom-account-id"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="Paste the Account ID"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="zoom-client-id">Client ID</Label>
                        <Input
                            id="zoom-client-id"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="Paste the Client ID"
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="zoom-client-secret">Client Secret</Label>
                        <div className="flex gap-2">
                            <Input
                                id="zoom-client-secret"
                                type={showSecret ? "text" : "password"}
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Paste the Client Secret"
                                autoComplete="off"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSecret((v) => !v)}
                            >
                                {showSecret ? "Hide" : "Show"}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="button" onClick={handleConnect} disabled={connecting}>
                        {connecting ? "Verifying…" : isConnected || hasSavedCredentials ? "Re-verify & save" : "Connect Zoom"}
                    </Button>
                    {(isConnected || hasSavedCredentials) && (
                        <Button type="button" variant="outline" onClick={handleDisconnect}>
                            Disconnect
                        </Button>
                    )}
                </div>
                {auth.status === "error" && auth.error && (
                    <p role="alert" className="text-sm text-destructive">{auth.error}</p>
                )}
            </div>
        </div>
    );
};

export default ZoomConfig;
