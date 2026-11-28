"use client";

// Checkr background check card — application detail page, right column.
//
// States, in Checkr's own words (never paraphrased into a false claim):
//   • No check yet — initiate form (Offer stage + consent + package).
//   • Invitation pending — Checkr emailed the candidate its hosted
//     apply-flow link; the report does not exist yet.
//   • Invitation completed + report pending — the candidate submitted
//     the apply flow; screenings are running.
//   • Report complete — result is Checkr's verbatim `clear` / `consider`
//     (null while pending). `consider` is NOT a rejection — adjudication
//     happens in the Checkr dashboard.
//   • suspended / dispute / canceled / expired — shown as reported.
// The card always shows the environment the check ran in (TEST vs LIVE)
// and when the status was last refreshed from Checkr. There is no live
// polling: Refresh re-reads Checkr on demand.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/use-permission";
import {
    cancel_checkr_check_action,
    initiate_checkr_check_action,
    list_checkr_packages_action,
    refresh_checkr_check_action,
} from "@/server/actions/checkr-actions";
import type { CheckrCheckState, CheckrEnvironment } from "@/types";

type Props = {
    applicationId: number;
    currentStage: string;
    candidateName: string;
    initialCheck: CheckrCheckState | null;
    pluginEnabled: boolean;
    environment: CheckrEnvironment;
    defaultPackage: string;
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

function status_badge(check: CheckrCheckState): { label: string; className: string } {
    if (check.reportStatus === "complete") {
        if (check.reportResult === "clear") {
            return { label: "Clear", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        }
        if (check.reportResult === "consider") {
            return { label: "Consider", className: "bg-amber-50 text-amber-700 border-amber-100" };
        }
        return { label: "Complete", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    if (check.reportStatus === "suspended") {
        return { label: "Suspended", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.reportStatus === "dispute") {
        return { label: "Dispute", className: "bg-red-50 text-red-700 border-red-100" };
    }
    if (check.reportStatus === "canceled" || check.invitationStatus === "canceled") {
        return { label: "Canceled", className: "bg-muted text-muted-foreground border-border" };
    }
    if (check.invitationStatus === "expired") {
        return { label: "Invitation expired", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.invitationStatus === "completed") {
        return { label: "Screening in progress", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    return { label: "Invitation pending", className: "bg-blue-50 text-blue-700 border-blue-100" };
}

const CheckrBackgroundCheckCard = ({
    applicationId,
    currentStage,
    candidateName,
    initialCheck,
    pluginEnabled,
    environment,
    defaultPackage,
}: Props) => {
    const hasPermission = useHasPermission();
    const canEdit = hasPermission("application:edit");
    const [check, setCheck] = useState<CheckrCheckState | null>(initialCheck);
    const [packages, setPackages] = useState<{ slug: string; name: string }[]>([]);
    const [packagesError, setPackagesError] = useState<string | null>(null);
    const [packageSlug, setPackageSlug] = useState(defaultPackage);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

    const isOfferStage = currentStage === "Offer";
    const badge = check ? status_badge(check) : null;
    const canCancel =
        check?.invitationStatus === "pending" && !check?.checkrReportId;
    // A terminal check (expired/canceled invitation, canceled report) can
    // be re-initiated — the form stays available below the old status.
    const isTerminalCheck =
        !!check &&
        (check.invitationStatus === "expired" ||
            check.invitationStatus === "canceled" ||
            check.reportStatus === "canceled");
    const showInitiateForm = pluginEnabled && (!check || isTerminalCheck);

    useEffect(() => {
        if (!showInitiateForm) return;
        let cancelled = false;
        list_checkr_packages_action()
            .then((result) => {
                if (cancelled) return;
                if (result.success) setPackages(result.packages ?? []);
                else setPackagesError(result.message);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setPackagesError(err instanceof Error ? err.message : "Failed to load packages");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [pluginEnabled, showInitiateForm]);

    const handleInitiate = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await initiate_checkr_check_action(applicationId, {
                packageSlug: packageSlug.trim(),
                consentConfirmed,
            });
            if (result.success && result.check) {
                setCheck(result.check);
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to initiate the background check.",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleRefresh = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await refresh_checkr_check_action(applicationId);
            if (result.success && result.check) {
                setCheck(result.check);
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

    const handleCancel = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const result = await cancel_checkr_check_action(applicationId);
            if (result.success && result.check) {
                setCheck(result.check);
                setMessage({ kind: "ok", text: result.message });
            } else {
                setMessage({ kind: "error", text: result.message });
            }
        } catch (err) {
            setMessage({
                kind: "error",
                text: err instanceof Error ? err.message : "Failed to cancel the invitation.",
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    Background Check
                </h3>
                <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                        environment === "live"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                >
                    {environment === "live" ? "Live" : "Test"}
                </span>
            </div>

            {!pluginEnabled && (
                <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                        Checkr isn&apos;t connected for this organization yet.
                    </p>
                    <Link
                        href="/settings/checkr"
                        className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm"
                    >
                        Connect Checkr
                    </Link>
                </div>
            )}

            {showInitiateForm && (
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        {isTerminalCheck
                            ? "The previous check ended without a report — you can initiate a new one."
                            : "Background checks start when a candidate receives an offer. Initiation is a deliberate action — nothing runs automatically."}
                    </p>

                    {!isOfferStage && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            This application is in the &ldquo;{currentStage}&rdquo; stage. Move it to
                            the Offer stage to initiate a background check.
                        </p>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="checkr-package">Screening package</Label>
                        {packages.length > 0 ? (
                            <select
                                id="checkr-package"
                                value={packageSlug}
                                onChange={(e) => setPackageSlug(e.target.value)}
                                disabled={!canEdit || !isOfferStage}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select a package…</option>
                                {packages.map((pkg) => (
                                    <option key={pkg.slug} value={pkg.slug}>
                                        {pkg.name} ({pkg.slug})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id="checkr-package"
                                value={packageSlug}
                                onChange={(e) => setPackageSlug(e.target.value)}
                                disabled={!canEdit || !isOfferStage}
                                placeholder="Package slug, e.g. tasker_standard"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                            />
                        )}
                        {packagesError && (
                            <p className="text-xs text-muted-foreground">
                                Couldn&apos;t load packages from Checkr ({packagesError}) — enter a
                                package slug from your Checkr dashboard instead.
                            </p>
                        )}
                    </div>

                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consentConfirmed}
                            onChange={(e) => setConsentConfirmed(e.target.checked)}
                            disabled={!canEdit || !isOfferStage}
                            className="mt-0.5"
                        />
                        <span>
                            I confirm {candidateName} received the FCRA disclosure and gave written
                            authorization for a background check, and our organization retains the
                            signed authorization. Checkr will also collect the candidate&apos;s
                            consent in its hosted apply flow.
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
                            onClick={handleInitiate}
                            disabled={busy || !isOfferStage || !consentConfirmed || !packageSlug.trim()}
                            className="w-full"
                        >
                            {busy
                                ? "Initiating…"
                                : environment === "live"
                                  ? "Initiate background check (LIVE)"
                                  : "Initiate background check (TEST)"}
                        </Button>
                    )}
                </div>
            )}

            {pluginEnabled && check && badge && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {check.packageSlug}
                        </span>
                    </div>

                    <div className="p-4 bg-muted rounded-xl border border-border space-y-3 text-sm">
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Invitation
                            </p>
                            <p className="font-semibold text-foreground">
                                {check.invitationStatus === "pending" &&
                                    "Sent — waiting for the candidate to complete Checkr's apply flow."}
                                {check.invitationStatus === "completed" &&
                                    "Completed — the candidate submitted the apply flow."}
                                {check.invitationStatus === "expired" &&
                                    "Expired — the invitation lapsed after 7 days. Initiate a new check to resend."}
                                {check.invitationStatus === "canceled" && "Canceled before completion."}
                            </p>
                            {check.invitationExpiresAt && check.invitationStatus === "pending" && (
                                <p className="text-xs text-muted-foreground">
                                    Expires {format_date_time(check.invitationExpiresAt)}
                                </p>
                            )}
                        </div>

                        {check.reportStatus && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Report
                                </p>
                                <p className="font-semibold text-foreground">
                                    {check.reportStatus}
                                    {check.reportResult ? ` · ${check.reportResult}` : ""}
                                    {check.adjudication ? ` · ${check.adjudication.replaceAll("_", " ")}` : ""}
                                </p>
                                {check.reportResult === "consider" && (
                                    <p className="text-xs text-muted-foreground">
                                        &ldquo;Consider&rdquo; is Checkr&apos;s result, not a decision —
                                        review and adjudicate in the Checkr dashboard.
                                    </p>
                                )}
                                {check.reportCompletedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Completed {format_date_time(check.reportCompletedAt)}
                                    </p>
                                )}
                            </div>
                        )}

                        {check.invitationUrl && check.invitationStatus === "pending" && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Candidate apply link
                                </p>
                                <a
                                    href={check.invitationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 underline break-all"
                                >
                                    Open Checkr apply flow
                                </a>
                                <p className="text-xs text-muted-foreground">
                                    Checkr also emailed this link to the candidate.
                                </p>
                            </div>
                        )}

                        {check.consentConfirmedAt && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Consent confirmed
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format_date_time(check.consentConfirmedAt)}
                                    {check.consentConfirmedBy ? ` · by ${check.consentConfirmedBy}` : ""}
                                </p>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Last refreshed from Checkr: {format_date_time(check.updatedAt)}
                            {check.environment === "live"
                                ? " · LIVE check (real, billable)"
                                : " · TEST check (staging, no real screening)"}
                        </p>
                    </div>

                    {check.errorMessage && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {check.errorMessage}
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
                            {canCancel && (
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={busy}
                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    Cancel invitation
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CheckrBackgroundCheckCard;
