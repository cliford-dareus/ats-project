"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/checkr-actions.ts — Checkr background checks.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow / requirePermission) and the application is proven to
// belong to it (assertApplicationBelongsToOrg, 404-style). No
// client-supplied orgId is ever trusted. Config reads are plugin:manage;
// per-application initiate/refresh/cancel are application:edit; reads are
// application:view. The Checkr API key is decrypted server-side only,
// sent only to Checkr over HTTPS, never logged, never returned.
//
// Flow (invitation-based — the only ordering path here):
//   1. Recruiter confirms the candidate's FCRA disclosure + written
//      authorization was obtained (checkbox in the UI; who + when is
//      recorded on the check row). Applico does not store the signed
//      form; the org retains it, and Checkr's hosted apply flow collects
//      the candidate's consent again before any screening runs.
//   2. The application must be in the Offer stage — the manifest's
//      "when a candidate receives an offer" seam. (JOB_STAGES includes
//      'Offer'; stages are per-job, so a job without an Offer stage
//      simply cannot initiate a check until one exists.)
//   3. Reuse the Checkr candidate by email, or create one (email +
//      name + zipcode only — SSN/DOB are never sent; Checkr collects
//      them in its hosted flow).
//   4. POST /invitations with the org's package slug. Checkr emails the
//      candidate the hosted apply-flow link; the report is created when
//      the candidate completes it.
//   5. Status is refreshed on demand (GET invitation, then GET report).
//      There is no live polling and no webhook receiver in this build —
//      the UI always shows when the status was last refreshed.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { applications, candidates, checkr_background_checks, job_listings, stages } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
    assertApplicationBelongsToOrg,
    getAuthOrThrow,
    hasPermission,
    requirePermission,
} from "@/server/permissions";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import {
    db_get_checkr_check,
    db_upsert_checkr_check,
    toCheckrCheckState,
    type CheckrCheckRow,
} from "@/server/queries/drizzle/checkr-queries";
import {
    cancelCheckrInvitation,
    checkr_work_location_from_job_location,
    createCheckrCandidate,
    createCheckrInvitation,
    findCheckrCandidateByEmail,
    getCheckrInvitation,
    getCheckrReport,
    listCheckrPackages,
    CheckrApiError,
    type CheckrPackage,
} from "@/server/checkr";
import { record_activity } from "@/server/activity/record-activity";
import type { CheckrCheckState, CheckrEnvironment } from "@/types";

type CheckrPluginConfig = {
    apiKey: string;
    environment: CheckrEnvironment;
    packageSlug: string;
};

/** Decrypted Checkr settings for the session org (server-only). */
async function loadCheckrConfig(orgId: string): Promise<CheckrPluginConfig | null> {
    const record = await db_get_organization_plugins(orgId);
    const settings = record.settings?.checkr;
    if (!settings || settings.active !== true) return null;
    const apiKey = settings.credentials?.apiKey ?? "";
    if (!apiKey) return null;
    const rawEnv = settings.config?.environment;
    // Safe default: anything other than an explicit "live" runs in test.
    const environment: CheckrEnvironment = rawEnv === "live" ? "live" : "test";
    return {
        apiKey,
        environment,
        packageSlug: typeof settings.config?.package === "string" ? settings.config.package : "",
    };
}

function toState(row: CheckrCheckRow): CheckrCheckState {
    return toCheckrCheckState(row);
}

function checkrFailure(err: unknown): { success: false; message: string } {
    if (err instanceof CheckrApiError) {
        return { success: false, message: err.detail };
    }
    console.error("Checkr action error:", err);
    return {
        success: false,
        message: (err as Error).message || "Checkr request failed",
    };
}

/**
 * Validate a Checkr API key against the selected environment with a
 * lightweight call — GET /packages returns 200 for a valid key, 401 for
 * an invalid one — and return the account's real packages so the config
 * UI can offer them. Called from the client-side Checkr provider auth
 * flow (mirrors verifyGoogle / verifyCalendly). The key is sent only to
 * Checkr, over HTTPS — never logged, never stored here (saving is a
 * separate, encrypting step).
 */
export async function verifyCheckr(
    apiKey: string,
    environment: CheckrEnvironment,
): Promise<{ success: boolean; message: string; packages?: CheckrPackage[] }> {
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const key = apiKey?.trim();
    if (!key) {
        return { success: false, message: "API key is required" };
    }
    if (environment !== "test" && environment !== "live") {
        return { success: false, message: "Environment must be test or live" };
    }

    try {
        const packages = await listCheckrPackages(key, environment);
        return {
            success: true,
            message: `API key is valid for Checkr ${environment === "live" ? "live" : "test (staging)"}`,
            packages,
        };
    } catch (err) {
        console.error("Checkr API key verification error:", err);
        return {
            success: false,
            message:
                err instanceof CheckrApiError
                    ? err.detail
                    : (err as Error).message || "Failed to verify Checkr API key",
        };
    }
}

/** List the org's real Checkr packages with the STORED key (decrypted
 * server-side — the browser never sees the key). Recruiters who can
 * initiate a check and admins who configure the plugin can both list. */
export async function list_checkr_packages_action(): Promise<{
    success: boolean;
    packages?: CheckrPackage[];
    environment?: CheckrEnvironment;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    const allowed =
        (await hasPermission("application:edit")) ||
        (await hasPermission("plugin:manage"));
    if (!allowed) {
        return { success: false, message: "Missing permission: application:edit" };
    }

    const config = await loadCheckrConfig(orgId);
    if (!config) {
        return { success: false, message: "Connect a Checkr API key first" };
    }

    try {
        const packages = await listCheckrPackages(config.apiKey, config.environment);
        return {
            success: true,
            packages,
            environment: config.environment,
            message: "Packages loaded",
        };
    } catch (err) {
        return checkrFailure(err);
    }
}

/** Current check state for one application, plus what the card needs to
 * render (plugin enabled, configured environment, default package).
 * Read-only values only — the API key is never in the response. */
export async function get_checkr_check_action(applicationId: number): Promise<{
    check: CheckrCheckState | null;
    pluginEnabled: boolean;
    environment: CheckrEnvironment;
    defaultPackage: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadCheckrConfig(orgId);
    const row = await db_get_checkr_check(applicationId, orgId);
    return {
        check: row ? toState(row) : null,
        pluginEnabled: config !== null,
        environment: config?.environment ?? "test",
        defaultPackage: config?.packageSlug ?? "",
    };
}

type ApplicationContext = {
    id: number;
    stageName: string | null;
    candidateName: string;
    candidateEmail: string;
    candidateZipcode: string | null;
    jobLocation: string | null;
};

async function loadApplicationContext(
    applicationId: number,
    orgId: string,
): Promise<ApplicationContext | null> {
    const [row] = await db
        .select({
            id: applications.id,
            stageName: stages.stage_name,
            candidateName: candidates.name,
            candidateEmail: candidates.email,
            candidateZipcode: candidates.zip_code,
            jobLocation: job_listings.location,
        })
        .from(applications)
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organization, orgId),
            ),
        )
        .limit(1);
    if (!row || !row.candidateName || !row.candidateEmail) return null;
    return {
        id: row.id,
        stageName: row.stageName,
        candidateName: row.candidateName,
        candidateEmail: row.candidateEmail,
        candidateZipcode: row.candidateZipcode,
        jobLocation: row.jobLocation,
    };
}

/** A check is "active" (re-initiation refused) while an invitation is
 * pending or a report is pending/complete/suspended/in dispute. A new
 * check may be ordered after an invitation expired/was canceled or a
 * report was canceled. */
function isCheckActive(check: CheckrCheckState | null): boolean {
    if (!check) return false;
    if (check.invitationStatus === "pending") return true;
    if (
        check.reportStatus === "pending" ||
        check.reportStatus === "complete" ||
        check.reportStatus === "suspended" ||
        check.reportStatus === "dispute"
    ) {
        return true;
    }
    return false;
}

/**
 * Initiate a background check for an application in the Offer stage.
 * Deliberate recruiter action only — never automatic. Requires the
 * consent confirmation (recorded with who/when) and a package slug.
 * Creates/reuses the Checkr candidate, then creates the invitation;
 * Checkr emails the candidate its hosted apply-flow link.
 */
export async function initiate_checkr_check_action(
    applicationId: number,
    input: { packageSlug: string; consentConfirmed: boolean },
): Promise<{ success: boolean; message: string; check?: CheckrCheckState }> {
    const { orgId, userId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    if (!input.consentConfirmed) {
        return {
            success: false,
            message:
                "Consent confirmation is required: confirm the candidate's FCRA disclosure and written authorization were obtained before initiating a background check.",
        };
    }
    const packageSlug = input.packageSlug?.trim();
    if (!packageSlug) {
        return {
            success: false,
            message:
                "A Checkr package is required. Pick one of the packages from your Checkr account (configure a default in Settings → Checkr).",
        };
    }

    const config = await loadCheckrConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Checkr is not connected for this organization. Connect it in Settings → Checkr first.",
        };
    }

    const ctx = await loadApplicationContext(applicationId, orgId);
    if (!ctx) {
        return { success: false, message: "Application not found" };
    }
    if (ctx.stageName !== "Offer") {
        return {
            success: false,
            message: `Background checks start when a candidate receives an offer. This application is in the "${ctx.stageName ?? "unknown"}" stage — move it to the Offer stage first.`,
        };
    }

    const existing = await db_get_checkr_check(applicationId, orgId);
    if (isCheckActive(existing ? toState(existing) : null)) {
        return {
            success: false,
            message: "A background check is already in progress or complete for this application. Refresh its status instead.",
        };
    }

    try {
        // Reuse the Checkr candidate for this email when one exists.
        const existingCandidate = await findCheckrCandidateByEmail(
            config.apiKey,
            config.environment,
            ctx.candidateEmail,
        );
        const checkrCandidate =
            existingCandidate ??
            (await createCheckrCandidate(config.apiKey, config.environment, {
                email: ctx.candidateEmail,
                name: ctx.candidateName,
                zipcode: ctx.candidateZipcode,
            }));

        const invitation = await createCheckrInvitation(
            config.apiKey,
            config.environment,
            {
                candidate_id: checkrCandidate.id,
                package: packageSlug,
                work_location: checkr_work_location_from_job_location(ctx.jobLocation),
            },
        );

        const row = await db_upsert_checkr_check(
            {
                application_id: applicationId,
                organization: orgId,
                environment: config.environment,
                package_slug: packageSlug,
                checkr_candidate_id: checkrCandidate.id,
                checkr_invitation_id: invitation.id,
                checkr_report_id: invitation.report_id,
                invitation_status: invitation.status,
                report_status: invitation.report_id ? "pending" : null,
                report_result: null,
                adjudication: null,
                invitation_url: invitation.invitation_url,
                invitation_expires_at: invitation.expires_at
                    ? new Date(invitation.expires_at)
                    : null,
                report_completed_at: null,
                consent_confirmed_by: userId,
                consent_confirmed_at: new Date(),
                error_message: null,
            },
            {
                environment: config.environment,
                package_slug: packageSlug,
                checkr_candidate_id: checkrCandidate.id,
                checkr_invitation_id: invitation.id,
                checkr_report_id: invitation.report_id,
                invitation_status: invitation.status,
                report_status: invitation.report_id ? "pending" : null,
                report_result: null,
                adjudication: null,
                invitation_url: invitation.invitation_url,
                invitation_expires_at: invitation.expires_at
                    ? new Date(invitation.expires_at)
                    : null,
                report_completed_at: null,
                consent_confirmed_by: userId,
                consent_confirmed_at: new Date(),
                error_message: null,
            },
        );

        await record_activity({
            action: "checkr_check_initiated",
            entity_type: "application",
            entity_id: applicationId,
            summary: `Background check initiated via Checkr (${config.environment}, package ${packageSlug}). Invitation sent to the candidate.`,
        });

        return {
            success: true,
            message:
                config.environment === "live"
                    ? "Background check initiated (LIVE — real check, billable). Checkr emailed the candidate the apply-flow link."
                    : "Background check initiated (TEST — staging, no real check). Checkr emailed the candidate the apply-flow link.",
            check: toState(row),
        };
    } catch (err) {
        const failure = checkrFailure(err);
        // Record the failure on the row (when one exists) so the card
        // shows Checkr's real error instead of silently showing nothing.
        if (existing) {
            await db
                .update(checkr_background_checks)
                .set({ error_message: failure.message })
                .where(eq(checkr_background_checks.id, existing.id));
        }
        return failure;
    }
}

/**
 * Re-read the check's status from Checkr (invitation, then report when
 * one exists) and store exactly what Checkr reports. No polling — the
 * recruiter triggers this from the card; the stored updated_at is the
 * "last refreshed" time shown in the UI.
 */
export async function refresh_checkr_check_action(
    applicationId: number,
): Promise<{ success: boolean; message: string; check?: CheckrCheckState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadCheckrConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Checkr is not connected for this organization.",
        };
    }

    const existing = await db_get_checkr_check(applicationId, orgId);
    if (!existing || !existing.checkr_invitation_id) {
        return { success: false, message: "No background check has been initiated for this application." };
    }

    try {
        const invitation = await getCheckrInvitation(
            config.apiKey,
            config.environment,
            existing.checkr_invitation_id,
        );

        let reportStatus = existing.report_status;
        let reportResult = existing.report_result;
        let adjudication = existing.adjudication;
        let reportCompletedAt = existing.report_completed_at;

        const reportId = invitation.report_id ?? existing.checkr_report_id;
        if (reportId) {
            const report = await getCheckrReport(config.apiKey, config.environment, reportId);
            reportStatus = report.status;
            reportResult = report.result;
            adjudication = report.adjudication;
            reportCompletedAt = report.completed_at ? new Date(report.completed_at) : null;
        }

        await db
            .update(checkr_background_checks)
            .set({
                invitation_status: invitation.status,
                checkr_report_id: reportId,
                report_status: reportStatus,
                report_result: reportResult,
                adjudication,
                report_completed_at: reportCompletedAt,
                invitation_url: invitation.invitation_url ?? existing.invitation_url,
                invitation_expires_at: invitation.expires_at
                    ? new Date(invitation.expires_at)
                    : existing.invitation_expires_at,
                error_message: null,
            })
            .where(eq(checkr_background_checks.id, existing.id));

        const updated = await db_get_checkr_check(applicationId, orgId);
        return {
            success: true,
            message: "Status refreshed from Checkr.",
            check: updated ? toState(updated) : undefined,
        };
    } catch (err) {
        const failure = checkrFailure(err);
        await db
            .update(checkr_background_checks)
            .set({ error_message: failure.message })
            .where(eq(checkr_background_checks.id, existing.id));
        return failure;
    }
}

/**
 * Cancel a still-pending invitation (no report exists yet). Once the
 * candidate has completed the apply flow and a report exists, the
 * invitation can no longer be canceled from here — cancel/dispute
 * handling moves to the Checkr dashboard.
 */
export async function cancel_checkr_check_action(
    applicationId: number,
): Promise<{ success: boolean; message: string; check?: CheckrCheckState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadCheckrConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Checkr is not connected for this organization.",
        };
    }

    const existing = await db_get_checkr_check(applicationId, orgId);
    if (!existing || !existing.checkr_invitation_id) {
        return { success: false, message: "No background check has been initiated for this application." };
    }
    if (existing.checkr_report_id || existing.invitation_status !== "pending") {
        return {
            success: false,
            message:
                "This invitation can no longer be canceled — the candidate has already completed the apply flow or the invitation is closed. Manage the report in the Checkr dashboard.",
        };
    }

    try {
        await cancelCheckrInvitation(
            config.apiKey,
            config.environment,
            existing.checkr_invitation_id,
        );

        await db
            .update(checkr_background_checks)
            .set({ invitation_status: "canceled", error_message: null })
            .where(eq(checkr_background_checks.id, existing.id));

        await record_activity({
            action: "checkr_check_canceled",
            entity_type: "application",
            entity_id: applicationId,
            summary: "Background check invitation canceled in Checkr before the candidate completed it.",
        });

        const updated = await db_get_checkr_check(applicationId, orgId);
        return {
            success: true,
            message: "Invitation canceled in Checkr.",
            check: updated ? toState(updated) : undefined,
        };
    } catch (err) {
        return checkrFailure(err);
    }
}
