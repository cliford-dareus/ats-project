"use client";

// Twilio SMS card — application detail page, right column.
//
// States, in plain terms (never a false claim):
//   • Twilio not connected — link to Settings → Twilio.
//   • No consent on file — the card says so and refuses to send; a
//     recruiter can record consent (checkbox + optional note; who +
//     when is the audit trail).
//   • Consented — send form (message, {{candidate.name}} /
//     {{job.title}} tokens, 1600-char Twilio limit) + the destination
//     phone from the candidate record + the org's sender number.
//   • Opted out — the card says so and refuses to send; re-opt-in
//     records a new consent row.
// A send reports Twilio's real result (message SID + queued status)
// or Twilio's real error — a failure is never shown as sent. "Queued"
// means Twilio accepted the message; delivery itself is asynchronous.

import { useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/use-permission";
import {
    get_twilio_sms_state_action,
    record_twilio_sms_consent_action,
    send_twilio_sms_action,
} from "@/server/actions/twilio-actions";
import type { TwilioSmsConsentState } from "@/types";

type Props = {
    applicationId: number;
    candidateName: string;
    candidatePhone: string;
    jobTitle: string;
    initialConsent: TwilioSmsConsentState | null;
    pluginEnabled: boolean;
    fromNumber: string;
};

export const TWILIO_SMS_MAX_LENGTH = 1600;

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

function consent_badge(consent: TwilioSmsConsentState | null): { label: string; className: string } {
    if (!consent) {
        return { label: "No consent on file", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (consent.status === "consented") {
        return { label: "Consented", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    return { label: "Opted out", className: "bg-red-50 text-red-700 border-red-100" };
}

const TwilioSmsCard = ({
    applicationId,
    candidateName,
    candidatePhone,
    jobTitle,
    initialConsent,
    pluginEnabled,
    fromNumber,
}: Props) => {
    const hasPermission = useHasPermission();
    const canEdit = hasPermission("application:edit");
    const [consent, setConsent] = useState<TwilioSmsConsentState | null>(initialConsent);
    const [messageText, setMessageText] = useState("");
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [consentNote, setConsentNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

    const badge = consent_badge(consent);
    const isConsented = consent?.status === "consented";
    const canSend = pluginEnabled && isConsented && canEdit;

    const refreshState = async () => {
        try {
            const state = await get_twilio_sms_state_action(applicationId);
            setConsent(state.consent);
        } catch {
            // Keep the locally known state on a refresh failure.
        }
    };

    const handleRecordConsent = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await record_twilio_sms_consent_action(applicationId, {
                status: "consented",
                note: consentNote.trim() || undefined,
            });
            if (result.success && result.consent) {
                setConsent(result.consent);
                setConsentConfirmed(false);
                setConsentNote("");
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to record consent.",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleOptOut = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await record_twilio_sms_consent_action(applicationId, {
                status: "opted_out",
                note: consentNote.trim() || undefined,
            });
            if (result.success && result.consent) {
                setConsent(result.consent);
                setConsentNote("");
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to record the opt-out.",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleSend = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await send_twilio_sms_action(applicationId, {
                message: messageText,
            });
            if (result.success) {
                setMessageText("");
                setMessage({ kind: "ok", text: result.message });
                await refreshState();
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to send SMS.",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4 text-muted-foreground" />
                    Twilio SMS
                </h3>
                <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${badge.className}`}
                >
                    {badge.label}
                </span>
            </div>

            {!pluginEnabled && (
                <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                        Twilio isn&apos;t connected for this organization yet.
                    </p>
                    <Link
                        href="/settings/twilio"
                        className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm"
                    >
                        Connect Twilio
                    </Link>
                </div>
            )}

            {pluginEnabled && (
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Text {candidateName} at{" "}
                        <span className="font-mono">{candidatePhone || "no phone on file"}</span>
                        {fromNumber ? (
                            <> from <span className="font-mono">{fromNumber}</span></>
                        ) : (
                            <> — no sender number configured in Settings → Twilio</>
                        )}
                        . {jobTitle ? <>Job: {jobTitle}. </> : null}
                        Sends are logged to the activity feed.
                    </p>

                    {/* Consent state + recording */}
                    {consent ? (
                        <div className="text-xs text-muted-foreground bg-muted rounded-xl border border-border px-3 py-2 space-y-1">
                            <p>
                                {consent.status === "consented" ? "Consent recorded " : "Opt-out recorded "}
                                {format_date_time(consent.recordedAt)}
                                {consent.recordedBy ? ` by ${consent.recordedBy}` : ""}
                                {` (source: ${consent.source})`}
                            </p>
                            {consent.note && <p>Note: {consent.note}</p>}
                        </div>
                    ) : (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            No SMS consent is on file for {candidateName} — no text can be
                            sent until consent is recorded below. Email opt-ins do not count.
                        </p>
                    )}

                    {!isConsented && (
                        <div className="space-y-3">
                            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consentConfirmed}
                                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                                    disabled={!canEdit}
                                    className="mt-0.5"
                                />
                                <span>
                                    I confirm {candidateName} agreed to receive text messages
                                    about their application, and I am recording that agreement
                                    (not an email opt-in).
                                </span>
                            </label>
                            <div className="space-y-1.5">
                                <Label htmlFor="twilio-consent-note">Note (optional)</Label>
                                <input
                                    id="twilio-consent-note"
                                    value={consentNote}
                                    onChange={(e) => setConsentNote(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. Agreed by phone, 28 Nov 2026"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <Button
                                onClick={handleRecordConsent}
                                disabled={!canEdit || !consentConfirmed || busy}
                            >
                                {busy ? "Recording…" : "Record consent"}
                            </Button>
                        </div>
                    )}

                    {isConsented && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="twilio-message">Message</Label>
                                <textarea
                                    id="twilio-message"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    disabled={!canSend}
                                    placeholder={`Hi {{candidate.name}}, …`}
                                    rows={3}
                                    maxLength={TWILIO_SMS_MAX_LENGTH}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Supports {"{{candidate.name}}"} and {"{{job.title}}"} ·{" "}
                                    {messageText.length}/{TWILIO_SMS_MAX_LENGTH} characters
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleSend}
                                    disabled={!canSend || !messageText.trim() || busy}
                                >
                                    {busy ? "Sending…" : "Send SMS"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleOptOut}
                                    disabled={!canEdit || busy}
                                >
                                    Record opt-out
                                </Button>
                            </div>
                        </div>
                    )}

                    {message && (
                        <p
                            className={`text-xs rounded-xl px-3 py-2 border ${
                                message.kind === "ok"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                                    : "text-red-700 bg-red-50 border-red-100"
                            }`}
                        >
                            {message.text}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TwilioSmsCard;
