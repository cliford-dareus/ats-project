"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/sterling-actions.ts — Sterling background checks.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow / requirePermission) and the application is proven to
// belong to it (assertApplicationBelongsToOrg, 404-style). No
// client-supplied orgId is ever trusted. Config reads are plugin:manage;
// per-application initiate/refresh are application:edit; reads are
// application:view. The Sterling Client ID / Client Secret are decrypted
// server-side only, sent only to Sterling over HTTPS, never logged,
// never returned. The OAuth bearer token is fetched fresh per operation
// and held only in memory.
//
// Flow (invite-based — the only ordering path here):
//   1. Recruiter confirms the candidate's FCRA disclosure + written
//      authorization was obtained (checkbox in the UI; who + when is
//      recorded on the check row). Applico does not store the signed
//      form; the org retains it, and Sterling's Candidate Hub collects
//      the candidate's consent again before any screening runs.
//   2. The application must be in the Offer stage — the manifest's
//      "when a candidate receives an offer" seam. (JOB_STAGES includes
//      'Offer'; stages are per-job, so a job without an Offer stage
//      simply cannot initiate a check until one exists.)
//   3. Create the Sterling candidate (givenName + familyName + email +
//      clientReferenceId `applico-app-<id>` only — SSN/DOB/address are
//      never sent). There is no documented candidate search endpoint,
//      so a 409 "email already in use" surfaces as Sterling's real
//      error instead of being silently worked around.
//   4. POST /screenings with the org's package id and the configured
//      invite workflow ("email": Sterling emails the candidate the
//      Candidate Hub link; "link": the form URL comes back in the
//      response). An idempotency-key makes retries safe.
//   5. Status is refreshed on demand (GET /screenings/{id}) and stored
//      verbatim. There is no live polling and no webhook/callback
//      receiver in this build — the UI always shows when the status
//      was last refreshed. There is NO cancel action: Sterling
//      documents no DELETE /screenings endpoint — cancellation happens
//      in the Sterling portal.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto";
import { db } from "@/drizzle/db";
import { applications, candidates, job_listings, stages, sterling_background_checks } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
    assertApplicationBelongsToOrg,
    getAuthOrThrow,
    hasPermission,
    requirePermission,
} from "@/server/permissions";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import {
    db_get_sterling_check,
    db_upsert_sterling_check,
    toSterlingCheckState,
    type SterlingCheckRow,
} from "@/server/queries/drizzle/sterling-queries";
import {
    createSterlingCandidate,
    createSterlingScreening,
    getSterlingAccessToken,
    getSterlingScreening,
    listSterlingPackages,
    SterlingApiError,
    type SterlingInviteMethod,
    type SterlingPackage,
} from "@/server/sterling";
import { record_activity } from "@/server/activity/record-activity";
import type { SterlingCheckState, SterlingEnvironment } from "@/types";

type SterlingPluginConfig = {
    clientId: string;
    clientSecret: string;
    environment: SterlingEnvironment;
    packageId: string;
    inviteMethod: SterlingInviteMethod;
};

/** Decrypted Sterling settings for the session org (server-only). */
async function loadSterlingConfig(orgId: string): Promise<SterlingPluginConfig | null> {
    const record = await db_get_organization_plugins(orgId);
    const settings = record.settings?.sterling;
    if (!settings || settings.active !== true) return null;
    const clientId = settings.credentials?.clientId ?? "";
    const clientSecret = settings.credentials?.clientSecret ?? "";
    if (!clientId || !clientSecret) return null;
    const rawEnv = settings.config?.environment;
    // Safe default: anything other than an explicit "live" runs in test.
    const environment: SterlingEnvironment = rawEnv === "live" ? "live" : "test";
    const rawInvite = settings.config?.inviteMethod;
    const inviteMethod: SterlingInviteMethod = rawInvite === "link" ? "link" : "email";
    return {
        clientId,
        clientSecret,
        environment,
        packageId: typeof settings.config?.package === "string" ? settings.config.package : "",
        inviteMethod,
    };
}

function toState(row: SterlingCheckRow): SterlingCheckState {
    return toSterlingCheckState(row);
}

function sterlingFailure(err: unknown): { success: false; message: string } {
    if (err instanceof SterlingApiError) {
        return { success: false, message: err.detail };
    }
    console.error("Sterling action error:", err);
    return {
        success: false,
        message: (err as Error).message || "Sterling request failed",
    };
}

/**
 * Validate Sterling credentials against the selected environment with
 * lightweight calls — POST /oauth, then GET /packages (200 for valid
 * credentials, 401 for invalid ones) — and return the account's real
 * packages so the config UI can offer them. Called from the client-side
 * Sterling provider auth flow (mirrors verifyCheckr). The credentials
 * are sent only to Sterling, over HTTPS — never logged, never stored
 * here (saving is a separate, encrypting step).
 */
export async function verifySterling(
    clientId: string,
    clientSecret: string,
    environment: SterlingEnvironment,
): Promise<{ success: boolean; message: string; packages?: SterlingPackage[] }> {
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const id = clientId?.trim();
    const secret = clientSecret?.trim();
    if (!id || !secret) {
        return { success: false, message: "Client ID and Client Secret are both required" };
    }
    if (environment !== "test" && environment !== "live") {
        return { success: false, message: "Environment must be test or live" };
    }

    try {
        const token = await getSterlingAccessToken(id, secret, environment);
        const packages = await listSterlingPackages(token, environment);
        return {
            success: true,
            message: `Sterling credentials are valid for ${environment === "live" ? "live (production)" : "test (Integration)"}`,
            packages,
        };
    } catch (err) {
        console.error("Sterling credential verification error:", err);
        return {
            success: false,
            message:
                err instanceof SterlingApiError
                    ? err.detail
                    : (err as Error).message || "Failed to verify Sterling credentials",
        };
    }
}

/** List the org's real Sterling packages with the STORED credentials
 * (decrypted server-side — the browser never sees them). Recruiters who
 * can initiate a check and admins who configure the plugin can both list. */
export async function list_sterling_packages_action(): Promise<{
    success: boolean;
    packages?: SterlingPackage[];
    environment?: SterlingEnvironment;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    const allowed =
        (await hasPermission("application:edit")) ||
        (await hasPermission("plugin:manage"));
    if (!allowed) {
        return { success: false, message: "Missing permission: application:edit" };
    }

    const config = await loadSterlingConfig(orgId);
    if (!config) {
        return { success: false, message: "Connect Sterling credentials first" };
    }

    try {
        const token = await getSterlingAccessToken(
            config.clientId,
            config.clientSecret,
            config.environment,
        );
        const packages = await listSterlingPackages(token, config.environment);
        return {
            success: true,
            packages,
            environment: config.environment,
            message: "Packages loaded",
        };
    } catch (err) {
        return sterlingFailure(err);
    }
}

/** Current check state for one application, plus what the card needs to
 * render (plugin enabled, configured environment, default package,
 * invite method). Read-only values only — credentials are never in the
 * response. */
export async function get_sterling_check_action(applicationId: number): Promise<{
    check: SterlingCheckState | null;
    pluginEnabled: boolean;
    environment: SterlingEnvironment;
    defaultPackage: string;
    inviteMethod: SterlingInviteMethod;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadSterlingConfig(orgId);
    const row = await db_get_sterling_check(applicationId, orgId);
    return {
        check: row ? toState(row) : null,
        pluginEnabled: config !== null,
        environment: config?.environment ?? "test",
        defaultPackage: config?.packageId ?? "",
        inviteMethod: config?.inviteMethod ?? "email",
    };
}

type ApplicationContext = {
    id: number;
    stageName: string | null;
    candidateName: string;
    candidateEmail: string;
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
    };
}

/**
 * A check is "active" (re-initiation refused) while a screening exists
 * and has not reached a terminal state. Terminal: the invite expired,
 * the screening was deleted/archived, the async order errored, or the
 * result was cancelled — in those cases a new check may be ordered.
 * A Complete screening (any result) blocks re-initiation: the report
 * exists and is reviewed in Sterling.
 */
function isCheckActive(check: SterlingCheckState | null): boolean {
    if (!check || !check.sterlingScreeningId) return false;
    if (check.result === "Cancelled") return false;
    if (
        check.status === "Expired Invite" ||
        check.status === "Deleted" ||
        check.status === "Archive" ||
        check.status === "Error"
    ) {
        return false;
    }
    return true;
}

/**
 * Initiate a background check for an application in the Offer stage.
 * Deliberate recruiter action only — never automatic. Requires the
 * consent confirmation (recorded with who/when) and a package id.
 * Creates the Sterling candidate, then creates the screening with the
 * configured invite workflow; Sterling emails the candidate (or
 * returns the Candidate Hub form URL) — the candidate completes
 * consent + PII in Sterling, never in Applico.
 */
export async function initiate_sterling_check_action(
    applicationId: number,
    input: { packageId: string; consentConfirmed: boolean },
): Promise<{ success: boolean; message: string; check?: SterlingCheckState }> {
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
    const packageId = input.packageId?.trim();
    if (!packageId) {
        return {
            success: false,
            message:
                "A Sterling package is required. Pick one of the packages from your Sterling account (configure a default in Settings → Sterling).",
        };
    }

    const config = await loadSterlingConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Sterling is not connected for this organization. Connect it in Settings → Sterling first.",
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

    const existing = await db_get_sterling_check(applicationId, orgId);
    if (isCheckActive(existing ? toState(existing) : null)) {
        return {
            success: false,
            message: "A background check is already in progress or complete for this application. Refresh its status instead.",
        };
    }

    try {
        const token = await getSterlingAccessToken(
            config.clientId,
            config.clientSecret,
            config.environment,
        );

        const candidate = await createSterlingCandidate(token, config.environment, {
            email: ctx.candidateEmail,
            name: ctx.candidateName,
            clientReferenceId: `applico-app-${applicationId}`,
        });

        const screening = await createSterlingScreening(token, config.environment, {
            candidateId: candidate.id,
            packageId,
            inviteMethod: config.inviteMethod,
            applicationId,
            idempotencyKey: randomUUID(),
        });

        const row = await db_upsert_sterling_check(
            {
                application_id: applicationId,
                organization: orgId,
                environment: config.environment,
                package_id: packageId,
                package_name: screening.packageName,
                sterling_candidate_id: candidate.id,
                sterling_screening_id: screening.id,
                status: screening.status || null,
                sub_status: screening.subStatus,
                result: screening.result,
                report_url: screening.reportUrl,
                invite_url: screening.inviteUrl,
                invite_method: config.inviteMethod,
                submitted_at: screening.submittedAt ? new Date(screening.submittedAt) : null,
                estimated_completion_at: screening.estimatedCompletionTime
                    ? new Date(screening.estimatedCompletionTime)
                    : null,
                consent_confirmed_by: userId,
                consent_confirmed_at: new Date(),
                error_message: null,
            },
            {
                environment: config.environment,
                package_id: packageId,
                package_name: screening.packageName,
                sterling_candidate_id: candidate.id,
                sterling_screening_id: screening.id,
                status: screening.status || null,
                sub_status: screening.subStatus,
                result: screening.result,
                report_url: screening.reportUrl,
                invite_url: screening.inviteUrl,
                invite_method: config.inviteMethod,
                submitted_at: screening.submittedAt ? new Date(screening.submittedAt) : null,
                estimated_completion_at: screening.estimatedCompletionTime
                    ? new Date(screening.estimatedCompletionTime)
                    : null,
                consent_confirmed_by: userId,
                consent_confirmed_at: new Date(),
                error_message: null,
            },
        );

        await record_activity({
            action: "sterling_check_initiated",
            entity_type: "application",
            entity_id: applicationId,
            summary: `Background check initiated via Sterling (${config.environment}, package ${packageId}). Candidate invite sent via ${config.inviteMethod === "link" ? "Candidate Hub link" : "email"}.`,
        });

        return {
            success: true,
            message:
                config.environment === "live"
                    ? "Background check initiated (LIVE — real check, billable). Sterling sent the candidate the Candidate Hub invite."
                    : "Background check initiated (TEST — Integration, no real check). Sterling sent the candidate the Candidate Hub invite.",
            check: toState(row),
        };
    } catch (err) {
        const failure = sterlingFailure(err);
        // Record the failure on the row (when one exists) so the card
        // shows Sterling's real error instead of silently showing nothing.
        if (existing) {
            await db
                .update(sterling_background_checks)
                .set({ error_message: failure.message })
                .where(eq(sterling_background_checks.id, existing.id));
        }
        return failure;
    }
}

/**
 * Re-read the check's status from Sterling (GET /screenings/{id}) and
 * store exactly what Sterling reports. No polling — the recruiter
 * triggers this from the card; the stored updated_at is the
 * "last refreshed" time shown in the UI.
 */
export async function refresh_sterling_check_action(
    applicationId: number,
): Promise<{ success: boolean; message: string; check?: SterlingCheckState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:edit");
    await assertApplicationBelongsToOrg(applicationId, orgId);

    const config = await loadSterlingConfig(orgId);
    if (!config) {
        return {
            success: false,
            message: "Sterling is not connected for this organization.",
        };
    }

    const existing = await db_get_sterling_check(applicationId, orgId);
    if (!existing || !existing.sterling_screening_id) {
        return { success: false, message: "No background check has been initiated for this application." };
    }

    try {
        const token = await getSterlingAccessToken(
            config.clientId,
            config.clientSecret,
            config.environment,
        );
        const screening = await getSterlingScreening(
            token,
            config.environment,
            existing.sterling_screening_id,
        );

        await db
            .update(sterling_background_checks)
            .set({
                status: screening.status || null,
                sub_status: screening.subStatus,
                result: screening.result,
                package_name: screening.packageName ?? existing.package_name,
                report_url: screening.reportUrl ?? existing.report_url,
                invite_url: screening.inviteUrl ?? existing.invite_url,
                submitted_at: screening.submittedAt
                    ? new Date(screening.submittedAt)
                    : existing.submitted_at,
                estimated_completion_at: screening.estimatedCompletionTime
                    ? new Date(screening.estimatedCompletionTime)
                    : existing.estimated_completion_at,
                error_message: null,
            })
            .where(eq(sterling_background_checks.id, existing.id));

        const updated = await db_get_sterling_check(applicationId, orgId);
        return {
            success: true,
            message: "Status refreshed from Sterling.",
            check: updated ? toState(updated) : undefined,
        };
    } catch (err) {
        const failure = sterlingFailure(err);
        await db
            .update(sterling_background_checks)
            .set({ error_message: failure.message })
            .where(eq(sterling_background_checks.id, existing.id));
        return failure;
    }
}
