"use client";

// WhatsApp message card — application detail page, right column.
//
// States, in Twilio's own words (never paraphrased into a false claim):
//   • No consent on file — the card says so plainly and the send form is
//     not offered. Record consent first (recruiter confirms the candidate
//     agreed to WhatsApp contact; who + when is stored).
//   • Consent on file — send form (approved template Content SID +
//     variables {{1}} {{2}} {{3}}). Only the template is sent.
//   • Sent messages — each row shows Twilio's verbatim status (queued /
//     sent / delivered / undelivered / failed) as last refreshed from
//     Twilio, plus Twilio's real error when one exists. Refresh re-reads
//     Twilio on demand. There is no live polling and no webhook receiver.
//   • Consent covers a different number than the candidate's current one
//     — sending is refused until consent is recorded again for the
//     current number (the server enforces this; the card surfaces it).
//
// The card never claims a message was delivered when Twilio did not say
// so: a send that Twilio accepted shows Twilio's status at send time
// (usually "queued"), and delivery is only shown after a refresh
// reports it.

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/use-permission";
import {
    get_whatsapp_state_action,
    record_whatsapp_consent_action,
    refresh_whatsapp_message_action,
    revoke_whatsapp_consent_action,
    send_whatsapp_message_action,
} from "@/server/actions/whatsapp-actions";
import type { WhatsappConsentState, WhatsappMessageState } from "@/types";

type Props = {
    applicationId: number;
    candidateName: string;
    jobTitle: string | null;
    initialConsent: WhatsappConsentState | null;
    initialMessages: WhatsappMessageState[];
    pluginEnabled: boolean;
    fromNumber: string;
    defaultTemplateSid: string;
    candidatePhone: string | null;
    candidatePhoneE164: string | null;
};

type WhatsappState = Awaited<ReturnType<typeof get_whatsapp_state_action>>;

function format_date_time(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    })} at ${date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    })}`;
}

function status_badge(status: string | null): { label: string; className: string } {
    if (!status) return { label: "No status", className: "bg-muted text-muted-foreground border-border" };
    if (status === "delivered" || status === "read") {
        return { label: status === "read" ? "Read" : "Delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    if (status === "sent" || status === "queued" || status === "sending") {
        return { label: status === "queued" ? "Queued" : "Sent", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (status === "failed" || status === "undelivered") {
        return { label: status === "failed" ? "Failed" : "Undelivered", className: "bg-red-50 text-red-700 border-red-100" };
    }
    return { label: status, className: "bg-muted text-muted-foreground border-border" };
}

const WhatsappMessageCard = ({
    applicationId,
    candidateName,
    jobTitle,
    initialConsent,
    initialMessages,
    pluginEnabled,
    fromNumber,
    defaultTemplateSid,
    candidatePhone,
    candidatePhoneE164,
}: Props) => {
    const hasPermission = useHasPermission();
    const canEdit = hasPermission("application:edit");
    const [consent, setConsent] = useState<WhatsappConsentState | null>(initialConsent);
    const [messages, setMessages] = useState<WhatsappMessageState[]>(initialMessages);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [consentSource, setConsentSource] = useState("manual");
    const [templateSid, setTemplateSid] = useState(defaultTemplateSid);
    const [var1, setVar1] = useState(candidateName);
    const [var2, setVar2] = useState(jobTitle ?? "");
    const [var3, setVar3] = useState("");
    const [busy, setBusy] = useState(false);
    const [refreshingId, setRefreshingId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

    const hasConsent = !!consent?.hasConsent;
    const phoneMismatch =
        hasConsent && !!candidatePhoneE164 && consent.phoneE164 !== candidatePhoneE164;
    const canSend = pluginEnabled && hasConsent && !phoneMismatch && !!candidatePhoneE164;

    const reloadState = async () => {
        const state: WhatsappState = await get_whatsapp_state_action(applicationId);
        setConsent(state.consent);
        setMessages(state.messages);
        setTemplateSid(state.defaultTemplateSid || templateSid);
    };

    const handleRecordConsent = async () => {
        if (!consentConfirmed) {
            setMessage({ kind: "error", text: "Confirm the candidate agreed to be contacted on WhatsApp first." });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const result = await record_whatsapp_consent_action(applicationId, {
                consentConfirmed: true,
                source: consentSource,
            });
            if (!result.success) {
                setMessage({ kind: "error", text: result.message });
                return;
            }
            setConsent(result.consent ?? null);
            setConsentConfirmed(false);
            setMessage({ kind: "ok", text: result.message });
        } catch (err) {
            setMessage({ kind: "error", text: (err as Error).message || "Failed to record consent" });
        } finally {
            setBusy(false);
        }
    };

    const handleRevokeConsent = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await revoke_whatsapp_consent_action(applicationId);
            if (!result.success) {
                setMessage({ kind: "error", text: result.message });
                return;
            }
            setConsent(result.consent ?? null);
            setMessage({ kind: "ok", text: result.message });
        } catch (err) {
            setMessage({ kind: "error", text: (err as Error).message || "Failed to revoke consent" });
        } finally {
            setBusy(false);
        }
    };

    const handleSend = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await send_whatsapp_message_action(applicationId, {
                templateContentSid: templateSid.trim(),
                variables: { "1": var1.trim(), "2": var2.trim(), "3": var3.trim() },
            });
            if (!result.success) {
                setMessage({ kind: "error", text: result.message });
                // A failed attempt is still logged server-side — reload so
                // the card shows Twilio's real error on the history row.
                await reloadState();
                return;
            }
            setMessage({ kind: "ok", text: result.message });
            await reloadState();
        } catch (err) {
            setMessage({ kind: "error", text: (err as Error).message || "Failed to send WhatsApp message" });
        } finally {
            setBusy(false);
        }
    };

    const handleRefresh = async (messageId: number) => {
        setRefreshingId(messageId);
        setMessage(null);
        try {
            const result = await refresh_whatsapp_message_action(applicationId, messageId);
            if (!result.success) {
                setMessage({ kind: "error", text: result.message });
                return;
            }
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId && result.sent ? result.sent : m)),
            );
            setMessage({ kind: "ok", text: result.message });
        } catch (err) {
            setMessage({ kind: "error", text: (err as Error).message || "Failed to refresh status" });
        } finally {
            setRefreshingId(null);
        }
    };

    return (
        <div className="rounded-md border p-6 space-y-4">
            <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" style={{ color: "#25d366" }} />
                <h2 className="text-lg font-semibold">WhatsApp</h2>
                {!pluginEnabled && (
                    <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                        Not connected
                    </span>
                )}
            </div>

            {message && (
                <div
                    role={message.kind === "error" ? "alert" : "status"}
                    className={`rounded-md border px-4 py-3 text-sm ${message.kind === "error"
                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                        }`}
                >
                    {message.text}
                </div>
            )}

            {!pluginEnabled && (
                <p className="text-sm text-muted-foreground">
                    WhatsApp is not connected for this organization. Connect Twilio in{" "}
                    <Link href="/settings/whatsapp" className="underline">
                        Settings → WhatsApp
                    </Link>{" "}
                    first — a registered WhatsApp sender and an approved template are required
                    before any message can be sent.
                </p>
            )}

            {pluginEnabled && (
                <>
                    <p className="text-sm text-muted-foreground">
                        Candidate number:{" "}
                        <span className="font-mono text-xs">
                            {candidatePhoneE164 ?? candidatePhone ?? "—"}
                        </span>
                        {!candidatePhoneE164 && candidatePhone && (
                            <span className="text-amber-600">
                                {" "}— this number is not valid for WhatsApp. Fix it on the candidate
                                record before sending.
                            </span>
                        )}
                        {fromNumber && (
                            <>
                                {" "}· Sending from{" "}
                                <span className="font-mono text-xs">{fromNumber}</span>
                            </>
                        )}
                    </p>

                    {/* ── Consent ─────────────────────────────────────────── */}
                    {hasConsent && !phoneMismatch ? (
                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                            <p className="text-sm font-semibold text-emerald-700">
                                ✓ WhatsApp consent on file
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Recorded {format_date_time(consent.consentedAt)}
                                {consent.source === "application_form"
                                    ? " — candidate opted in on the application form"
                                    : " — recruiter confirmed the candidate agreed to WhatsApp contact"}
                                {" "}for <span className="font-mono text-xs">{consent.phoneE164}</span>.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRevokeConsent}
                                disabled={!canEdit || busy}
                            >
                                Revoke consent
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border p-4 space-y-3">
                            <p className="text-sm font-semibold">
                                {phoneMismatch
                                    ? "Consent is on file for a different number"
                                    : "No WhatsApp consent on file"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {phoneMismatch
                                    ? `Consent on file covers ${consent?.phoneE164}, but the candidate's current number is ${candidatePhoneE164}. Record consent again for the current number before sending — never message a number the candidate never agreed to be reached on.`
                                    : "Never message a candidate on WhatsApp without their consent. Confirm how consent was obtained, then record it — who confirmed and when is stored."}
                            </p>
                            <label className="flex items-start gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consentConfirmed}
                                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                                    disabled={!canEdit || busy}
                                    className="mt-0.5"
                                />
                                <span>
                                    The candidate agreed to be contacted on WhatsApp
                                    {candidatePhoneE164 ? ` at ${candidatePhoneE164}` : ""}.
                                </span>
                            </label>
                            <div className="space-y-2">
                                <Label htmlFor="whatsapp-consent-source">How was consent obtained?</Label>
                                <select
                                    id="whatsapp-consent-source"
                                    value={consentSource}
                                    onChange={(e) => setConsentSource(e.target.value)}
                                    disabled={!canEdit || busy}
                                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                >
                                    <option value="manual">Confirmed by recruiter (call / in person)</option>
                                    <option value="application_form">Candidate opted in on the application form</option>
                                </select>
                            </div>
                            <Button
                                type="button"
                                onClick={handleRecordConsent}
                                disabled={!canEdit || busy || !consentConfirmed}
                            >
                                {busy ? "Recording…" : "Record consent"}
                            </Button>
                        </div>
                    )}

                    {/* ── Send form ───────────────────────────────────────── */}
                    {canSend && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="whatsapp-template-sid">Approved template Content SID</Label>
                                <Input
                                    id="whatsapp-template-sid"
                                    value={templateSid}
                                    onChange={(e) => setTemplateSid(e.target.value)}
                                    placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="font-mono"
                                    disabled={busy}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Only approved templates are sent — copy the Content SID from Twilio
                                    Console → Messaging → Content Template Builder. No free-form
                                    messages: Applico cannot know whether the 24-hour session window
                                    is open.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Template variables</Label>
                                <p className="text-xs text-muted-foreground">
                                    Fill the placeholders your template defines, in order. Leave
                                    unused ones blank.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs w-10 shrink-0">{"{{1}}"}</span>
                                        <Input value={var1} onChange={(e) => setVar1(e.target.value)} placeholder="Candidate name" disabled={busy} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs w-10 shrink-0">{"{{2}}"}</span>
                                        <Input value={var2} onChange={(e) => setVar2(e.target.value)} placeholder="Job title" disabled={busy} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs w-10 shrink-0">{"{{3}}"}</span>
                                        <Input value={var3} onChange={(e) => setVar3(e.target.value)} placeholder="e.g. interview time" disabled={busy} />
                                    </div>
                                </div>
                            </div>
                            <Button type="button" onClick={handleSend} disabled={!canEdit || busy || !templateSid.trim()}>
                                {busy ? "Sending…" : "Send WhatsApp template"}
                            </Button>
                        </div>
                    )}

                    {/* ── History ─────────────────────────────────────────── */}
                    {messages.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold">Sent messages</h3>
                            {messages.map((m) => {
                                const badge = status_badge(m.status);
                                return (
                                    <div key={m.id} className="rounded-md border p-3 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs rounded-full border px-2 py-0.5 ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                            <code className="font-mono text-xs text-muted-foreground">{m.templateContentSid}</code>
                                            <span className="text-xs text-muted-foreground">
                                                {format_date_time(m.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            To <span className="font-mono">{m.toPhone}</span>
                                            {m.twilioMessageSid ? (
                                                <> · Twilio <span className="font-mono">{m.twilioMessageSid}</span></>
                                            ) : (
                                                " · never accepted by Twilio"
                                            )}
                                            {m.updatedAt && m.updatedAt !== m.createdAt && (
                                                <> · last refreshed {format_date_time(m.updatedAt)}</>
                                            )}
                                        </p>
                                        {m.errorMessage && (
                                            <p role="alert" className="text-xs text-red-500">
                                                {m.errorMessage}
                                            </p>
                                        )}
                                        {m.twilioMessageSid && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRefresh(m.id)}
                                                disabled={!canEdit || refreshingId === m.id}
                                            >
                                                {refreshingId === m.id ? "Refreshing…" : "Refresh status from Twilio"}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WhatsappMessageCard;
