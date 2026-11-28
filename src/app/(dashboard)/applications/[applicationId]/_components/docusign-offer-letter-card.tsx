"use client";

// DocuSign offer-letter card — application detail page, right column.
//
// States, in DocuSign's own words (never paraphrased into a false claim):
//   • No envelope yet — send form (Offer stage + "offer is final"
//     confirmation + configured template).
//   • sent / delivered — DocuSign emailed the candidate the signing
//     link; the candidate has not signed yet.
//   • signed — the candidate signed; DocuSign is finalizing.
//   • completed — signed by all recipients. This is DocuSign's word
//     for "signed", and only DocuSign's word ever produces it.
//   • declined — the candidate declined to sign.
//   • voided — the envelope was voided (from here, or in DocuSign).
// The card always shows the environment the envelope ran in (DEMO vs
// PRODUCTION) and when the status was last refreshed from DocuSign.
// There is no live polling: Refresh re-reads DocuSign on demand.

import { useState } from "react";
import Link from "next/link";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/use-permission";
import {
    refresh_docusign_envelope_action,
    send_docusign_offer_action,
    void_docusign_envelope_action,
} from "@/server/actions/docusign-actions";
import type { DocuSignEnvelopeState, DocuSignEnvironment } from "@/types";

type Props = {
    applicationId: number;
    currentStage: string;
    candidateName: string;
    initialEnvelope: DocuSignEnvelopeState | null;
    pluginEnabled: boolean;
    environment: DocuSignEnvironment;
    defaultTemplateId: string;
    defaultRoleName: string;
    defaultEmailSubject: string;
};

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

function status_badge(envelope: DocuSignEnvelopeState): { label: string; className: string } {
    switch (envelope.envelopeStatus) {
        case "completed":
            return { label: "Signed", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        case "declined":
            return { label: "Declined", className: "bg-red-50 text-red-700 border-red-100" };
        case "voided":
            return { label: "Voided", className: "bg-muted text-muted-foreground border-border" };
        case "signed":
            return { label: "Signed — finalizing", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        case "delivered":
            return { label: "Delivered — awaiting signature", className: "bg-blue-50 text-blue-700 border-blue-100" };
        case "sent":
            return { label: "Sent — awaiting signature", className: "bg-blue-50 text-blue-700 border-blue-100" };
        case "created":
            return { label: "Draft", className: "bg-zinc-100 text-zinc-600 border-zinc-200" };
        default:
            return {
                label: envelope.envelopeStatus ? `Status: ${envelope.envelopeStatus}` : "Unknown status",
                className: "bg-zinc-100 text-zinc-600 border-zinc-200",
            };
    }
}

const DocuSignOfferLetterCard = ({
    applicationId,
    currentStage,
    candidateName,
    initialEnvelope,
    pluginEnabled,
    environment,
    defaultTemplateId,
    defaultRoleName,
    defaultEmailSubject,
}: Props) => {
    const hasPermission = useHasPermission();
    const canEdit = hasPermission("application:edit");
    const [envelope, setEnvelope] = useState<DocuSignEnvelopeState | null>(initialEnvelope);
    const [emailSubject, setEmailSubject] = useState(defaultEmailSubject);
    const [confirmFinal, setConfirmFinal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

    const isOfferStage = currentStage === "Offer";
    const badge = envelope ? status_badge(envelope) : null;
    const canVoid =
        envelope?.envelopeStatus === "sent" || envelope?.envelopeStatus === "delivered";
    // A terminal envelope (declined / voided) can be re-sent as a fresh
    // envelope — the form stays available below the old status. A
    // completed (signed) envelope is never re-sent.
    const isTerminalEnvelope =
        !!envelope &&
        (envelope.envelopeStatus === "declined" || envelope.envelopeStatus === "voided");
    const showSendForm = pluginEnabled && (!envelope || isTerminalEnvelope);

    const handleSend = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await send_docusign_offer_action(applicationId, {
                confirmFinal,
                emailSubject: emailSubject.trim() || undefined,
            });
            if (result.success && result.envelope) {
                setEnvelope(result.envelope);
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to send the offer letter.",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleRefresh = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await refresh_docusign_envelope_action(applicationId);
            if (result.success && result.envelope) {
                setEnvelope(result.envelope);
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to refresh status.",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleVoid = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await void_docusign_envelope_action(applicationId);
            if (result.success && result.envelope) {
                setEnvelope(result.envelope);
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to void the envelope.",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-muted-foreground" />
                    Offer Letter
                </h3>
                <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                        environment === "production"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                >
                    {environment === "production" ? "Production" : "Demo"}
                </span>
            </div>

            {!pluginEnabled && (
                <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                        DocuSign isn&apos;t connected for this organization yet.
                    </p>
                    <Link
                        href="/settings/docusign"
                        className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm"
                    >
                        Connect DocuSign
                    </Link>
                </div>
            )}

            {showSendForm && (
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        {isTerminalEnvelope
                            ? "The previous envelope ended without a signature — you can send a new one."
                            : "Offer letters are sent when a candidate receives an offer. Sending is a deliberate action — nothing runs automatically."}
                    </p>

                    {!isOfferStage && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            This application is in the &ldquo;{currentStage}&rdquo; stage. Move it to
                            the Offer stage to send an offer letter for e-signature.
                        </p>
                    )}

                    {!defaultTemplateId && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            No offer-letter template is configured. Pick one of your DocuSign templates
                            in Settings → DocuSign first — the template carries the offer-letter
                            document and its signature tabs.
                        </p>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="docusign-email-subject">Email subject</Label>
                        <Input
                            id="docusign-email-subject"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            disabled={!canEdit || !isOfferStage}
                            placeholder="Please sign: your offer letter"
                        />
                        <p className="text-xs text-muted-foreground">
                            Template: <code className="font-mono">{defaultTemplateId || "none configured"}</code>
                            {defaultTemplateId && (
                                <> · signer role <code className="font-mono">{defaultRoleName}</code></>
                            )}
                        </p>
                    </div>

                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmFinal}
                            onChange={(e) => setConfirmFinal(e.target.checked)}
                            disabled={!canEdit || !isOfferStage}
                            className="mt-0.5"
                        />
                        <span>
                            I confirm this offer letter is final and ready to send to {candidateName}
                            {environment === "production"
                                ? " — this is a PRODUCTION send (real, legally-binding signature)."
                                : " — this is a DEMO send (test signature, no legal weight)."}
                        </span>
                    </label>

                    {message && (
                        <p
                            className={`text-sm rounded-xl px-3 py-2 border ${
                                message.kind === "error"
                                    ? "text-red-600 bg-red-50 border-red-100"
                                    : "text-emerald-700 bg-emerald-50 border-emerald-100"
                            }`}
                        >
                            {message.text}
                        </p>
                    )}

                    {canEdit && (
                        <Button
                            onClick={handleSend}
                            disabled={busy || !isOfferStage || !confirmFinal || !defaultTemplateId}
                            className="w-full"
                        >
                            {busy
                                ? "Sending…"
                                : environment === "production"
                                  ? "Send offer letter (PRODUCTION)"
                                  : "Send offer letter (DEMO)"}
                        </Button>
                    )}
                </div>
            )}

            {pluginEnabled && envelope && badge && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {envelope.templateRoleName}
                        </span>
                    </div>

                    <div className="p-4 bg-muted rounded-xl border border-border space-y-3 text-sm">
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Envelope
                            </p>
                            <p className="font-semibold text-foreground">
                                {envelope.envelopeStatus === "sent" &&
                                    "Sent — DocuSign emailed the candidate the signing link."}
                                {envelope.envelopeStatus === "delivered" &&
                                    "Delivered — the candidate opened the envelope and has not signed yet."}
                                {envelope.envelopeStatus === "signed" &&
                                    "Signed — the candidate signed; DocuSign is finalizing the envelope."}
                                {envelope.envelopeStatus === "completed" &&
                                    "Completed — signed by all recipients."}
                                {envelope.envelopeStatus === "declined" &&
                                    "Declined — the candidate declined to sign."}
                                {envelope.envelopeStatus === "voided" &&
                                    "Voided — the envelope is no longer valid."}
                                {envelope.envelopeStatus === "created" &&
                                    "Draft — created but not sent."}
                                {!["sent", "delivered", "signed", "completed", "declined", "voided", "created"].includes(envelope.envelopeStatus ?? "") &&
                                    `DocuSign reports status "${envelope.envelopeStatus}".`}
                            </p>
                            {envelope.recipientStatus && (
                                <p className="text-xs text-muted-foreground">
                                    Signer status: {envelope.recipientStatus}
                                    {envelope.recipientEmail ? ` · ${envelope.recipientEmail}` : ""}
                                </p>
                            )}
                            {envelope.emailSubject && (
                                <p className="text-xs text-muted-foreground">
                                    Subject: {envelope.emailSubject}
                                </p>
                            )}
                        </div>

                        {envelope.completedAt && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Signed
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format_date_time(envelope.completedAt)}
                                </p>
                            </div>
                        )}

                        {envelope.declinedAt && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Declined
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format_date_time(envelope.declinedAt)}
                                </p>
                            </div>
                        )}

                        {envelope.voidedReason && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Voided reason
                                </p>
                                <p className="text-xs text-muted-foreground">{envelope.voidedReason}</p>
                            </div>
                        )}

                        {envelope.sentAt && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Sent
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format_date_time(envelope.sentAt)}
                                    {envelope.sentBy ? ` · by ${envelope.sentBy}` : ""}
                                </p>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Last refreshed from DocuSign: {format_date_time(envelope.updatedAt)}
                            {envelope.environment === "production"
                                ? " · PRODUCTION envelope (real, legally-binding)"
                                : " · DEMO envelope (test signature, no legal weight)"}
                        </p>
                    </div>

                    {envelope.errorMessage && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {envelope.errorMessage}
                        </p>
                    )}

                    {message && (
                        <p
                            className={`text-sm rounded-xl px-3 py-2 border ${
                                message.kind === "error"
                                    ? "text-red-600 bg-red-50 border-red-100"
                                    : "text-emerald-700 bg-emerald-50 border-emerald-100"
                            }`}
                        >
                            {message.text}
                        </p>
                    )}

                    {canEdit && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={busy}
                                className="flex-1"
                            >
                                {busy ? "Working…" : "Refresh status"}
                            </Button>
                            {canVoid && (
                                <Button
                                    variant="outline"
                                    onClick={handleVoid}
                                    disabled={busy}
                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    Void envelope
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DocuSignOfferLetterCard;
