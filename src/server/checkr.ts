// ─────────────────────────────────────────────────────────────────────────────
// server/checkr.ts — Checkr API v1 client (server-only).
//
// Auth: HTTP Basic with the API key as the username and an empty password
// (`Authorization: Basic base64(key + ":")`). There is no Bearer scheme
// and no separate test/live key prefix — the ENVIRONMENT selects the host:
//
//   • test → https://api.checkr-staging.com/v1 (staging account: no real
//     checks run, no billable events; requires a staging account, which
//     Checkr only creates off an already-authenticated production account)
//   • live → https://api.checkr.com/v1 (real checks, billable; the account
//     must be credentialed by Checkr AND explicitly enabled for Reports —
//     Checkr's docs say to email clients@checkr.com before integrating)
//
// Ground truth (verified against docs.checkr.com, 2026-11-28):
//   • POST /candidates — email is the only required field; first_name,
//     last_name, dob, ssn, zipcode, work_locations are optional at the
//     API level (ssn/dob are required by most US screenings, but those
//     are collected by Checkr's hosted apply flow, not by Applico —
//     Applico never asks for or stores a candidate's SSN/DOB).
//   • GET  /candidates?email= — reuse an existing Checkr candidate
//     (Checkr recommends reusing candidates instead of creating one per
//     report). Response is a paginated list ({ object: 'list', data: [] }).
//   • POST /invitations — candidate_id + package (slug) required;
//     work_locations required for hierarchy-enabled accounts. The
//     invitation emails the candidate a link to Checkr's hosted apply
//     flow, where they confirm their info, provide consent, and submit.
//     Valid 7 days; Checkr re-notifies every 24h. Response carries
//     invitation_url + report_id (null until the candidate completes the
//     flow). Status: pending / completed / expired.
//   • GET  /invitations/{id} — status + report_id once created.
//   • DELETE /invitations/{id} — cancel a still-pending invitation.
//   • GET  /reports/{id} — status: pending / complete / suspended /
//     dispute / canceled; result: clear / consider (null while pending);
//     adjudication: engaged / pre_adverse_action / post_adverse_action;
//     completed_at when all screenings finished.
//   • GET  /packages — the account's screening packages (slugs are
//     account-specific, configured in the Checkr dashboard; an unknown
//     slug fails invitation creation with a 422). Used both to verify a
//     key and to let the recruiter pick a real package.
//   • POST /reports (direct report creation) is deliberately NOT used:
//     it requires candidate PII + authorization data Applico does not
//     hold. The invitation flow is the only ordering path here.
//
// No polling: Checkr recommends webhooks (report.completed etc.) over
// polling. This build does NOT register a webhook (outbound webhooks
// are out of scope) — status is refreshed on demand from the UI, and
// the UI always says when the status was last refreshed.
//
// The API key is NEVER logged and NEVER returned to the client. Every
// failure surfaces Checkr's real error body/status — never a generic
// "failed". 429s are surfaced, never retry-looped.
// ─────────────────────────────────────────────────────────────────────────────

import type { CheckrEnvironment } from "@/types";

export const CHECKR_API_BASES: Record<CheckrEnvironment, string> = {
    test: "https://api.checkr-staging.com/v1",
    live: "https://api.checkr.com/v1",
};

export const CHECKR_ENV_LABELS: Record<CheckrEnvironment, string> = {
    test: "Test (staging) — no real checks, no charges",
    live: "Live (production) — real checks, billable",
};

export class CheckrApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
        super(detail || `Checkr API error (HTTP ${status})`);
        this.name = "CheckrApiError";
        this.status = status;
        this.detail = detail;
    }
    /** True for 429 rate-limit responses. */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
}

export type CheckrPackage = {
    slug: string;
    name: string;
};

export type CheckrCandidate = {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
};

export type CheckrInvitation = {
    id: string;
    status: "pending" | "completed" | "expired";
    invitation_url: string | null;
    report_id: string | null;
    expires_at: string | null;
    candidate_id: string;
    package: string;
};

export type CheckrReport = {
    id: string;
    status: "pending" | "complete" | "suspended" | "dispute" | "canceled";
    result: "clear" | "consider" | null;
    adjudication: "engaged" | "pre_adverse_action" | "post_adverse_action" | null;
    completed_at: string | null;
    candidate_id: string;
    package: string;
};

export type CheckrWorkLocation = {
    country: string;
    state: string;
    city: string;
};

type CheckrErrorBody = {
    error?: string | { message?: string };
    message?: string;
};

function checkr_error_detail(body: unknown, status: number): string {
    if (body && typeof body === "object") {
        const b = body as CheckrErrorBody;
        const raw = b.error;
        const detail =
            (typeof raw === "string" ? raw : raw?.message) ?? b.message;
        if (detail) return `Checkr API error (HTTP ${status}): ${detail}`;
    }
    return `Checkr API error (HTTP ${status})`;
}

/**
 * Parse a "City, ST" job location into a Checkr work location. Returns
 * null when the location does not parse — the caller then omits
 * work_locations (optional for most accounts) instead of sending a
 * guessed value. Country is always US: Applico jobs carry no country
 * field and Checkr's work-location country is an ISO-3166 alpha-2 code.
 */
export function checkr_work_location_from_job_location(
    location: string | null | undefined,
): CheckrWorkLocation | null {
    if (!location) return null;
    const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const state = parts[parts.length - 1];
    const city = parts.slice(0, -1).join(", ");
    if (!/^[A-Z]{2}$/.test(state) || !city) return null;
    return { country: "US", state, city };
}

/** Split "First Last" into Checkr's first_name/last_name fields. */
function split_name(name: string): { first_name: string; last_name: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
        first_name: parts[0] ?? "",
        last_name: parts.slice(1).join(" ") || parts[0] || "",
    };
}

async function checkr_request<T>(
    apiKey: string,
    environment: CheckrEnvironment,
    path: string,
    init?: RequestInit,
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${CHECKR_API_BASES[environment]}${path}`, {
            ...init,
            headers: {
                // Basic auth: API key as username, empty password.
                Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Checkr (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body (e.g. an empty 204 on DELETE) — fall through to
        // status handling.
    }

    if (!res.ok) {
        throw new CheckrApiError(res.status, checkr_error_detail(body, res.status));
    }

    return body as T;
}

function form_body(params: Record<string, string | undefined>): URLSearchParams {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") body.set(key, value);
    }
    return body;
}

/** Lightweight key check + package list. GET /packages returns 200 for a
 * valid key (401 for an invalid one) and the account's real packages. */
export async function listCheckrPackages(
    apiKey: string,
    environment: CheckrEnvironment,
): Promise<CheckrPackage[]> {
    const res = await checkr_request<{ data?: { slug?: string; name?: string }[] }>(
        apiKey,
        environment,
        "/packages",
    );
    return (res.data ?? []).map((p) => ({
        slug: p.slug ?? "",
        name: p.name ?? p.slug ?? "",
    })).filter((p) => p.slug !== "");
}

/** Find an existing Checkr candidate by email (Checkr recommends reuse). */
export async function findCheckrCandidateByEmail(
    apiKey: string,
    environment: CheckrEnvironment,
    email: string,
): Promise<CheckrCandidate | null> {
    const res = await checkr_request<{ data?: CheckrCandidate[] }>(
        apiKey,
        environment,
        `/candidates?email=${encodeURIComponent(email)}`,
    );
    return res.data?.[0] ?? null;
}

/**
 * Create a Checkr candidate. Only email is required by the API; name and
 * zipcode are passed when Applico holds them. SSN/DOB are NEVER sent —
 * Checkr collects them (and the candidate's consent) in its hosted
 * apply flow after the invitation is created.
 */
export async function createCheckrCandidate(
    apiKey: string,
    environment: CheckrEnvironment,
    input: { email: string; name: string; zipcode?: string | null },
): Promise<CheckrCandidate> {
    const { first_name, last_name } = split_name(input.name);
    return checkr_request<CheckrCandidate>(apiKey, environment, "/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form_body({
            email: input.email,
            first_name,
            last_name,
            zipcode: input.zipcode ?? undefined,
        }),
    });
}

export async function createCheckrInvitation(
    apiKey: string,
    environment: CheckrEnvironment,
    input: {
        candidate_id: string;
        package: string;
        work_location?: CheckrWorkLocation | null;
    },
): Promise<CheckrInvitation> {
    const body = form_body({
        candidate_id: input.candidate_id,
        package: input.package,
    });
    // Rails-style nested params, as in Checkr's own form examples.
    if (input.work_location) {
        body.set("work_locations[0][country]", input.work_location.country);
        body.set("work_locations[0][state]", input.work_location.state);
        body.set("work_locations[0][city]", input.work_location.city);
    }
    return checkr_request<CheckrInvitation>(apiKey, environment, "/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
}

export async function getCheckrInvitation(
    apiKey: string,
    environment: CheckrEnvironment,
    invitationId: string,
): Promise<CheckrInvitation> {
    return checkr_request<CheckrInvitation>(
        apiKey,
        environment,
        `/invitations/${encodeURIComponent(invitationId)}`,
    );
}

export async function cancelCheckrInvitation(
    apiKey: string,
    environment: CheckrEnvironment,
    invitationId: string,
): Promise<void> {
    await checkr_request<unknown>(
        apiKey,
        environment,
        `/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
    );
}

export async function getCheckrReport(
    apiKey: string,
    environment: CheckrEnvironment,
    reportId: string,
): Promise<CheckrReport> {
    return checkr_request<CheckrReport>(
        apiKey,
        environment,
        `/reports/${encodeURIComponent(reportId)}`,
    );
}
