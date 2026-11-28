"use client";

// Sterling background check card — application detail page, right column.
//
// States, in Sterling's own words (never paraphrased into a false claim):
//   • No check yet — initiate form (Offer stage + consent + package).
//   • NotStarted / PreDraft — invite sent, candidate has not acted yet.
//   • InProgress / Pending — candidate acted and/or the order is processing.
//   • Complete — result is Sterling's verbatim `Clear` / `Consider` /
//     `Passed` / `Review` / `Level1`–`Level3` (null while pending).
//     `Consider` / `Review` is NOT a rejection — adjudication happens
//     in the Sterling portal.
//   • ActionNeeded / ReadyForReview / Review / Hold / Dispute /
//     AdverseAction states / Expired Invite / Deleted — shown as reported.
// The card always shows the environment the check ran in (TEST vs LIVE)
// and when the status was last refreshed from Sterling. There is no live
// polling: Refresh re-reads Sterling on demand. There is no cancel
// button: Sterling documents no screening-cancel endpoint —
// cancellation happens in the Sterling portal.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/use-permission";
import {
    initiate_sterling_check_action,
    list_sterling_packages_action,
    refresh_sterling_check_action,
} from "@/server/actions/sterling-actions";
import type { SterlingCheckState, SterlingEnvironment } from "@/types";

type Props = {
    applicationId: number;
    currentStage: string;
    candidateName: string;
    initialCheck: SterlingCheckState | null;
    pluginEnabled: boolean;
    environment: SterlingEnvironment;
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

function status_badge(check: SterlingCheckState): { label: string; className: string } {
    if (check.status === "Complete") {
        if (check.result === "Clear" || check.result === "Passed") {
            return { label: check.result, className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
        }
        if (check.result === "Consider" || check.result === "Review") {
            return { label: check.result, className: "bg-amber-50 text-amber-700 border-amber-100" };
        }
        if (check.result === "Level1" || check.result === "Level2" || check.result === "Level3") {
            return { label: check.result, className: "bg-amber-50 text-amber-700 border-amber-100" };
        }
        return { label: "Complete", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    }
    if (check.status === "Dispute") {
        return { label: "Dispute", className: "bg-red-50 text-red-700 border-red-100" };
    }
    if (check.status === "Expired Invite") {
        return { label: "Invite expired", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.status === "Deleted" || check.result === "Cancelled") {
        return { label: "Canceled", className: "bg-muted text-muted-foreground border-border" };
    }
    if (check.status === "ActionNeeded") {
        return { label: "Action needed", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.status === "Review" || check.status === "ReadyForReview") {
        return { label: "Needs review", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.status === "Hold") {
        return { label: "On hold", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    if (check.status === "NotStarted" || check.status === "PreDraft" || check.status === "Draft") {
        return { label: "Invite sent", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (check.status === "Queued") {
        return { label: "Queued", className: "bg-blue-50 text-blue-700 border-blue-100" };
    }
    if (check.status === "Error") {
        return { label: "Error", className: "bg-red-50 text-red-700 border-red-100" };
    }
    return { label: "Screening in progress", className: "bg-blue-50 text-blue-700 border-blue-100" };
}

const SterlingBackgroundCheckCard = ({
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
    const [check, setCheck] = useState<SterlingCheckState | null>(initialCheck);
    const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
    const [packagesError, setPackagesError] = useState<string | null>(null);
    const [packageId, setPackageId] = useState(defaultPackage);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

    const isOfferStage = currentStage === "Offer";
    const badge = check ? status_badge(check) : null;
    // A terminal check (expired/deleted invite, errored order, cancelled
    // result) can be re-initiated — the form stays available below the
    // old status. A Complete screening blocks re-initiation: the report
    // exists and is reviewed in Sterling.
    const isTerminalCheck =
        !!check &&
        (check.status === "Expired Invite" ||
            check.status === "Deleted" ||
            check.status === "Archive" ||
            check.status === "Error" ||
            check.result === "Cancelled");
    const showInitiateForm = pluginEnabled && (!check || isTerminalCheck);

    useEffect(() => {
        if (!showInitiateForm) return;
        let cancelled = false;
        list_sterling_packages_action()
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
            const result = await initiate_sterling_check_action(applicationId, {
                packageId: packageId.trim(),
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
            const result = await refresh_sterling_check_action(applicationId);
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

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    Background Check — Sterling
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
                        Sterling isn&apos;t connected for this organization yet.
                    </p>
                    <Link
                        href="/settings/sterling"
                        className="px-4 py-2 bg-card border border-border rounded-lg text-xs font-bold text-accent hover:bg-muted transition-all shadow-sm"
                    >
                        Connect Sterling
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
                        <Label htmlFor="sterling-package">Screening package</Label>
                        {packages.length > 0 ? (
                            <select
                                id="sterling-package"
                                value={packageId}
                                onChange={(e) => setPackageId(e.target.value)}
                                disabled={!canEdit || !isOfferStage}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select a package…</option>
                                {packages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name} ({pkg.id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id="sterling-package"
                                value={packageId}
                                onChange={(e) => setPackageId(e.target.value)}
                                disabled={!canEdit || !isOfferStage}
                                placeholder="Package id, e.g. 85685"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                            />
                        )}
                        {packagesError && (
                            <p className="text-xs text-muted-foreground">
                                Couldn&apos;t load packages from Sterling ({packagesError}) — enter a
                                package id from your Sterling dashboard instead.
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
                            signed authorization. Sterling will also collect the candidate&apos;s
                            consent in its Candidate Hub.
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
                            disabled={busy || !isOfferStage || !consentConfirmed || !packageId.trim()}
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
                            {check.packageName ?? check.packageId}
                        </span>
                    </div>

                    <div className="p-4 bg-muted rounded-xl border border-border space-y-3 text-sm">
                        <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Screening
                            </p>
                            <p className="font-semibold text-foreground">
                                {check.status ?? "—"}
                                {check.subStatus && check.subStatus !== check.status
                                    ? ` · ${check.subStatus}`
                                    : ""}
                                {check.result ? ` · ${check.result}` : ""}
                            </p>
                            {check.status === "NotStarted" && (
                                <p className="text-xs text-muted-foreground">
                                    Invite sent — waiting for the candidate to complete Sterling&apos;s Candidate Hub flow.
                                </p>
                            )}
                            {check.status === "Expired Invite" && (
                                <p className="text-xs text-muted-foreground">
                                    The invite expired before the candidate completed it. Initiate a new check to resend.
                                </p>
                            )}
                            {(check.result === "Consider" || check.result === "Review") && (
                                <p className="text-xs text-muted-foreground">
                                    &ldquo;{check.result}&rdquo; is Sterling&apos;s result, not a decision —
                                    review and adjudicate in the Sterling portal.
                                </p>
                            )}
                            {check.submittedAt && (
                                <p className="text-xs text-muted-foreground">
                                    Submitted {format_date_time(check.submittedAt)}
                                </p>
                            )}
                            {check.estimatedCompletionAt && check.status !== "Complete" && (
                                <p className="text-xs text-muted-foreground">
                                    Estimated completion {format_date_time(check.estimatedCompletionAt)}
                                </p>
                            )}
                        </div>

                        {check.inviteUrl && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Candidate invite link
                                </p>
                                <a
                                    href={check.inviteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 underline break-all"
                                >
                                    Open Sterling Candidate Hub form
                                </a>
                            </div>
                        )}

                        {check.reportUrl && (
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    Report
                                </p>
                                <a
                                    href={check.reportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 underline break-all"
                                >
                                    View screening in Sterling
                                </a>
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
                            Last refreshed from Sterling: {format_date_time(check.updatedAt)}
                            {check.environment === "live"
                                ? " · LIVE check (real, billable)"
                                : " · TEST check (Integration, no real screening)"}
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
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Sterling documents no screening-cancel endpoint — cancel a screening in the Sterling portal.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SterlingBackgroundCheckCard;
