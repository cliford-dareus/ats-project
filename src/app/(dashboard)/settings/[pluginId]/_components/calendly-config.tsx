'use client';

// Calendly config — Personal Access Token, event types, webhooks.
//
// Honest states (same masked-key rule as Google/Resend):
//   • "Connected · Calendly API verified this session" — this session's
//     token was just verified against GET /users/me.
//   • "Saved · key stored, not verified this session" — a masked token
//     is stored; nothing was verified this session.
//   • "Not connected" — no token stored.
//
// What Calendly does here (stated in the UI, not just in code):
//   • Books interviews through the Calendly API from the schedule modal
//     (recruiter picks a real event type + time; Applico books it).
//   • No Google Calendar event is created on the Calendly path, and
//     holds are not available — bookings go straight to the slot.
//   • API booking is capped at 5 requests/user/day on Calendly Free
//     plans (Paid non-Enterprise 100/day); when the cap is hit the
//     booking fails with Calendly's real error and the recruiter falls
//     back to the event type's public booking link.
//   • Cancellations made in Calendly flow back ONLY when webhooks are
//     enabled below; otherwise cancel from Applico.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuthenticateProvider, useProviderAuthState } from "@/hooks/use-plugin-registry";
import { pluginRegistry } from "@/lib/plugin-registry";
import { CALENDLY_BRAND_COLOR, CALENDLY_REQUIRED_SCOPES } from "@/plugins/providers/calendly";
import { verifyCalendly } from "@/server/actions/plugin-actions";
import {
    disable_calendly_webhooks_action,
    enable_calendly_webhooks_action,
    get_calendly_webhook_status_action,
    list_calendly_event_types_action,
    type CalendlyEventTypeDTO,
} from "@/server/actions/calendly-actions";
import { copyTextToClipboard } from "@/lib/job-display";
import ApiKeySection from "./shared/api-key-section";
import { ConfigProps } from "./shared/types";

type WebhookStatus = Awaited<ReturnType<typeof get_calendly_webhook_status_action>>;

const CalendlyConfig = ({ pluginId, settings, onSave }: ConfigProps) => {
    const authenticate = useAuthenticateProvider();
    const auth = useProviderAuthState(pluginId);

    const maskedKey =
        typeof settings?.credentials?.apiKey === "string"
            ? settings.credentials.apiKey
            : "";
    const hasSavedKey = !!maskedKey;
    const isConnected = auth.status === "authenticated";
    const savedUserName =
        typeof settings?.config?.userName === "string" ? settings.config.userName : "";
    const savedUserEmail =
        typeof settings?.config?.userEmail === "string" ? settings.config.userEmail : "";

    const [apiKey, setApiKey] = useState("");
    const [connectError, setConnectError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [eventTypes, setEventTypes] = useState<CalendlyEventTypeDTO[]>([]);
    const [eventTypesError, setEventTypesError] = useState<string | null>(null);
    const [eventTypesLoading, setEventTypesLoading] = useState(false);

    const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
    const [webhookBusy, setWebhookBusy] = useState(false);
    const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

    const [copyState, setCopyState] = useState<Record<string, "idle" | "copied" | "failed">>({});

    const loadEventTypes = async () => {
        setEventTypesLoading(true);
        setEventTypesError(null);
        try {
            const result = await list_calendly_event_types_action();
            if (result.success) setEventTypes(result.eventTypes);
            else setEventTypesError(result.message);
        } catch (err) {
            setEventTypesError((err as Error).message || "Failed to load event types");
        } finally {
            setEventTypesLoading(false);
        }
    };

    const loadWebhookStatus = async () => {
        try {
            setWebhookStatus(await get_calendly_webhook_status_action());
        } catch {
            // Webhook state is secondary — a load failure leaves the
            // section showing "not enabled" rather than breaking the page.
            setWebhookStatus(null);
        }
    };

    // A stored token (masked) means the org is connected even before
    // this session verifies it — load the live event types + webhook
    // state so the page shows what Calendly can actually do.
    useEffect(() => {
        if (!hasSavedKey && !isConnected) return;
        loadEventTypes();
        loadWebhookStatus();
    }, [hasSavedKey, isConnected]);

    const handleConnect = async (key?: string) => {
        const tokenToUse = (key ?? apiKey).trim();
        if (!tokenToUse) return;
        setConnectError(null);
        try {
            // 1. Verify ONLY — GET /users/me. No badge change yet, and the
            // returned user is what gets stored as display config.
            const check = await verifyCalendly(tokenToUse);
            if (!check.success) throw new Error(check.message);
            // 2. Persist FIRST (encrypted server-side). If this throws —
            // e.g. missing PLUGIN_ENCRYPTION_KEY — the badge never claimed
            // "Connected" for a token that isn't stored.
            await onSave({
                ...settings,
                active: true,
                credentials: { apiKey: tokenToUse },
                config: {
                    ...(settings.config ?? {}),
                    userName: check.user?.name ?? "",
                    userEmail: check.user?.email ?? "",
                    userUri: check.user?.uri ?? "",
                },
            });
            // 3. Only now mark the session authenticated. authenticate()
            // re-verifies and keeps only the masked key client-side.
            await authenticate(pluginId, { apiKey: tokenToUse });
            setApiKey("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            loadEventTypes();
            loadWebhookStatus();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to connect Calendly");
        }
    };

    const handleDisconnect = async () => {
        setConnectError(null);
        try {
            // Delete the webhook subscription FIRST, while the token is
            // still stored (best-effort — it never blocks the disconnect).
            try {
                await disable_calendly_webhooks_action();
            } catch {
                // The subscription delete is best-effort; the token clear
                // below still runs.
            }
            // Clear server-side FIRST; only drop the local auth state on
            // success, so a failed clear doesn't leave the UI claiming
            // "Not connected" while the server still holds the token.
            await onSave({
                ...settings,
                active: false,
                credentials: {},
                config: {
                    ...(settings.config ?? {}),
                    userName: "",
                    userEmail: "",
                    userUri: "",
                    webhookSubscriptionUri: "",
                    webhookEnabled: false,
                },
            });
            setApiKey("");
            setEventTypes([]);
            setWebhookStatus(null);
            await pluginRegistry.getProvider(pluginId)?.deauthenticate();
        } catch (e) {
            setConnectError((e as Error).message || "Failed to disconnect Calendly");
        }
    };

    const handleEnableWebhooks = async () => {
        setWebhookBusy(true);
        setWebhookMessage(null);
        try {
            const result = await enable_calendly_webhooks_action();
            setWebhookMessage(result.message);
            loadWebhookStatus();
        } catch (e) {
            setWebhookMessage((e as Error).message || "Failed to enable webhooks");
        } finally {
            setWebhookBusy(false);
        }
    };

    const handleDisableWebhooks = async () => {
        setWebhookBusy(true);
        setWebhookMessage(null);
        try {
            const result = await disable_calendly_webhooks_action();
            setWebhookMessage(result.message);
            loadWebhookStatus();
        } catch (e) {
            setWebhookMessage((e as Error).message || "Failed to disable webhooks");
        } finally {
            setWebhookBusy(false);
        }
    };

    const handleCopy = async (key: string, value: string) => {
        const ok = await copyTextToClipboard(value);
        setCopyState((prev) => ({ ...prev, [key]: ok ? "copied" : "failed" }));
        window.setTimeout(
            () => setCopyState((prev) => ({ ...prev, [key]: "idle" })),
            2500
        );
    };

    return (
        <div className="space-y-8">
            <div
                className="border px-4 flex items-center h-14 gap-3 sticky top-0 z-10 bg-foreground rounded-md">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-full"
                        style={{ backgroundColor: CALENDLY_BRAND_COLOR }}
                    >
                        <span className="text-white text-sm font-black">C</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-background/80">Calendly</div>
                        <div className="text-xs text-background/20">
                            API booking + event types
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <div
                    className="flex items-center gap-6 py-1 px-3 rounded-md text-sm"
                    style={{
                        background: isConnected ? "#0d1a14" : hasSavedKey ? "#171207" : "#111",
                        border: `1px solid ${isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#1f1f1f"}`,
                        color: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#4b5563",
                    }}>
                    <div className="w-5 h-5 rounded-full bg-card shadow-[0_0_4px_#10b981] dark:bg-card dark:shadow-[0_0_4px_#374151]">
                        <div className="w-5 h-5 rounded-full" style={{ background: isConnected ? "#10b981" : hasSavedKey ? "#f59e0b" : "#374151" }} />
                    </div>
                    {isConnected ? "Connected" : hasSavedKey ? "Saved" : "Not connected"}
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
                <h2 className="text-lg font-semibold">What Calendly does here — and what it doesn&apos;t</h2>
                <p className="text-sm text-muted-foreground">
                    When Calendly is connected, the schedule modal offers a Calendly option: pick one of your
                    real event types and a time, and Applico books the candidate into that slot via the
                    Calendly API. The booking belongs to the connected Calendly account — interviewers you
                    pick are still recorded on the interview and emailed, but they don&apos;t get their own
                    Calendly event.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>No Google Calendar event is created on the Calendly path; availability comes from Calendly.</li>
                    <li>Holds are not available on the Calendly path — bookings go straight to the candidate&apos;s slot.</li>
                    <li>API booking is capped at 5 requests per user per day on Calendly Free plans (100/day on paid non-Enterprise). When the cap is hit, the booking fails with Calendly&apos;s real error and the modal offers the event type&apos;s public booking link instead.</li>
                    <li>Cancellations made in Calendly flow back only when webhooks are enabled below; otherwise cancel from Applico.</li>
                </ul>
            </div>

            <ApiKeySection
                apiKey={apiKey}
                maskedKey={maskedKey || undefined}
                onApiKeyChange={setApiKey}
                auth={auth}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                pluginId={pluginId}
            />

            <div className="rounded-md border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Create a Personal Access Token</h2>
                <p className="text-sm text-muted-foreground">
                    In Calendly: Profile → Developer → Personal access tokens → create one and name it
                    (e.g. “Applico”). <strong className="text-foreground">Select the scopes below explicitly</strong> —
                    new tokens get no API access until scopes are chosen. A token is shown only once, and
                    Calendly asks for an email verification code at creation. At most 10 tokens per account.
                </p>
                <div>
                    <Label>Scopes the token needs</Label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {CALENDLY_REQUIRED_SCOPES.map((scope) => (
                            <Badge key={scope} variant="outline" className="font-mono text-xs">
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
                {savedUserName && (
                    <p className="text-sm text-muted-foreground">
                        Connected as <span className="font-semibold text-foreground">{savedUserName}</span>
                        {savedUserEmail ? ` (${savedUserEmail})` : ""}. Bookings are made under this
                        Calendly account.
                    </p>
                )}
            </div>

            {(hasSavedKey || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Your Calendly event types</h2>
                    {eventTypesLoading && (
                        <p className="text-sm text-muted-foreground">Loading event types…</p>
                    )}
                    {eventTypesError && (
                        <p role="alert" className="text-sm text-destructive">{eventTypesError}</p>
                    )}
                    {!eventTypesLoading && !eventTypesError && eventTypes.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No active event types found for this Calendly account. Create one in Calendly first.
                        </p>
                    )}
                    {eventTypes.length > 0 && (
                        <ul className="text-sm space-y-3">
                            {eventTypes.map((et) => (
                                <li key={et.uri} className="flex items-start justify-between gap-3 border rounded-md p-3">
                                    <div>
                                        <p className="font-semibold">{et.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {et.duration} min · {et.kind} ·{" "}
                                            <a href={et.schedulingUrl} target="_blank" rel="noreferrer" className="underline">
                                                {et.schedulingUrl}
                                            </a>
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopy(et.uri, et.schedulingUrl)}
                                    >
                                        {copyState[et.uri] === "copied"
                                            ? "Copied!"
                                            : copyState[et.uri] === "failed"
                                              ? "Copy failed"
                                              : "Copy booking link"}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {(hasSavedKey || isConnected) && (
                <div className="rounded-md border p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Webhooks — sync Calendly cancellations back</h2>
                    <p className="text-sm text-muted-foreground">
                        When enabled, Applico registers a webhook for <code className="font-mono text-xs">invitee.canceled</code> (and{" "}
                        <code className="font-mono text-xs">invitee.created</code>) scoped to the connected Calendly user.
                        Cancellations made in Calendly then cancel the interview in Applico automatically.
                        Webhook plan gating is unsettled — Calendly&apos;s reference says these events are on all
                        plans including Free, while some guides say Standard+ is required. If registration fails,
                        the real Calendly error is shown and the connection keeps working without webhooks.
                    </p>
                    {webhookStatus && (
                        <div className="text-sm space-y-1">
                            <p>
                                Status:{" "}
                                <span className="font-semibold">
                                    {webhookStatus.enabled ? "Enabled" : "Not enabled"}
                                </span>
                            </p>
                            {webhookStatus.callbackUrl && (
                                <p className="text-muted-foreground">
                                    Callback URL: <code className="font-mono text-xs">{webhookStatus.callbackUrl}</code>
                                </p>
                            )}
                            {!webhookStatus.appUrlConfigured && (
                                <p className="text-amber-600">
                                    NEXT_PUBLIC_APP_URL is not set, so Calendly has no public callback URL to call.
                                    Set it before enabling webhooks.
                                </p>
                            )}
                            {webhookStatus.subscriptionUri && (
                                <p className="text-muted-foreground break-all">
                                    Subscription: <code className="font-mono text-xs">{webhookStatus.subscriptionUri}</code>
                                </p>
                            )}
                        </div>
                    )}
                    {!webhookStatus?.enabled && (
                        <p className="text-sm text-amber-600">
                            Webhooks not enabled — cancellations made in Calendly won&apos;t sync back; cancel from
                            Applico instead.
                        </p>
                    )}
                    {webhookMessage && (
                        <p role="status" className="text-sm text-muted-foreground">{webhookMessage}</p>
                    )}
                    <div className="flex gap-2">
                        {webhookStatus?.enabled ? (
                            <Button type="button" variant="outline" onClick={handleDisableWebhooks} disabled={webhookBusy}>
                                {webhookBusy ? "Working…" : "Disable webhooks"}
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleEnableWebhooks} disabled={webhookBusy || (webhookStatus !== null && !webhookStatus.appUrlConfigured)}>
                                {webhookBusy ? "Working…" : "Enable webhooks"}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendlyConfig;
