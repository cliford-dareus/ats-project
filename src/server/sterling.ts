// ─────────────────────────────────────────────────────────────────────────────
// server/sterling.ts — Sterling (First Advantage) API v2 client (server-only).
//
// Auth: OAuth2 client credentials — NOT a single API key. POST /oauth with
// HTTP Basic base64(client_id:client_secret) and
// grant_type=client_credentials returns a bearer token that expires after
// 1 hour (3600s). The token is fetched fresh per operation (initiation
// and refresh are infrequent manual actions; the oauth rate limit is
// 125 req / 5 min) and never logged, stored, or returned to the client.
//
// Hosts (US only in this build — verified against apidocs.sterlingcheck.app,
// 2026-11-28; the legacy sterling.readme.io docs are deprecated):
//   • test → https://api.us.int.sterlingcheck.app/v2 (Integration env —
//     Developer Portal test account; no real checks, no charges; test and
//     production credentials are SEPARATE sets, provisioned per region)
//   • live → https://api.us.sterlingcheck.app/v2 (Production — real
//     checks, billable; the account must be set up with Sterling first:
//     packages configured, credentialing completed — the org's Sterling
//     account manager provisions the Client ID / Client Secret)
// EMEA, Canada and APAC are production-only and need region-specific
// credentials (api.eu. / api.ca. / api.au. hosts); they are out of scope
// for this build — see the config UI note.
//
// Ground truth (verified against apidocs.sterlingcheck.app, 2026-11-28):
//   • POST /oauth — see above.
//   • GET  /packages — the account's screening packages; a package is a
//     group of screening products, and the response also says which
//     candidate fields are required for that package. Used both to
//     verify credentials and to let the recruiter pick a real package.
//     Response shape is parsed permissively (Sterling's versioning
//     section says to ignore unrecognized fields).
//   • POST /candidates — minimum fields: givenName, familyName,
//     middleName, email, clientReferenceId. Further fields may be
//     required by the chosen package (see GET /packages). Applico sends
//     only name + email + a clientReferenceId — SSN/DOB/address are
//     NEVER sent; Sterling collects them (and the candidate's consent)
//     in its Candidate Hub after the invite. 409 email?already-in-use /
//     409 clientReferenceId?already-in-use when the candidate exists.
//     There is no documented candidate search/list endpoint, so a 409
//     is surfaced as Sterling's real error, not silently worked around.
//   • POST /screenings — candidateId + packageId required. Workflow
//     options via `invite.method`: "email" (Sterling emails the
//     candidate the Candidate Hub link) or "link" (the form URL comes
//     back in the screening response for the caller to share). A third
//     option — initiate directly when all required candidate fields
//     already exist — is NOT used: Applico does not hold the required
//     PII, so the invite workflow is the only ordering path here.
//     Supports an `idempotency-key` header (safe retries, 24h window).
//     Under async processing (a client-level feature enabled by a
//     Sterling rep) a 202 returns status "Queued" with the same order
//     and candidate IDs. Response carries id, packageId, packageName,
//     accountId, candidateId, status, result, subStatus, links.admin.web
//     (interactive-summary report link), reportItems, submittedAt,
//     updatedAt, estimatedCompletionTime.
//   • GET  /screenings/{id} — same screening shape; the status source
//     for on-demand refresh. GET /candidates/{id} exists but is unused
//     here (nothing in the card needs a re-read of the candidate).
//   • Errors are { errors: [{ code: "400#field?reason", message }] }.
//     429 = rate limited (300 req / 5 min for screenings/candidates).
//   • No DELETE /screenings endpoint is documented — a screening is
//     cancelled in the Sterling portal, not from Applico. There is no
//     cancel action in this build; do not invent one.
//   • Detailed reports (PDF/HTML) are described in the docs' Reports
//     section, but no report-download endpoint path was verified from
//     the public docs, so none is called here — the admin interactive
//     summary link (links.admin.web) is the report link. Fetching a
//     report file is a follow-up once the endpoint is confirmed.
//   • No polling: Sterling recommends callbacks over polling. This
//     build does NOT register a callback receiver (outbound webhooks
//     are out of scope) — status is refreshed on demand from the UI,
//     and the UI always says when the status was last refreshed.
//   • No adjudication / adverse-action calls from Applico — pre/post
//     adverse action happens in the Sterling portal.
//
// Statuses and results below are Sterling's VERBATIM values (docs,
// "Statuses & Results"): status PreDraft / Draft / NotStarted /
// InProgress / Pending / Complete / ActionNeeded / ReadyForReview /
// Review / AdverseAction / Pre-Adverse Action Initiated / Pre-Adverse
// Action Sent / Adverse Action Paused / Adverse Action Cancelled /
// Adverse Action Resumed / Adverse Action Sent / Dispute / Archive /
// Hold / Pending Adjudication / Expired Invite / Deleted (plus Queued
// and Error under async processing); result Pending / Clear / Consider
// / Passed / Review / Cancelled / Level1 / Level2 / Level3. Stored
// verbatim — never mapped onto Checkr's values or paraphrased.
// ─────────────────────────────────────────────────────────────────────────────

import type { SterlingEnvironment } from "@/types";

export const STERLING_API_BASES: Record<SterlingEnvironment, string> = {
    test: "https://api.us.int.sterlingcheck.app/v2",
    live: "https://api.us.sterlingcheck.app/v2",
};

export const STERLING_ENV_LABELS: Record<SterlingEnvironment, string> = {
    test: "Test (Integration) — no real checks, no charges",
    live: "Live (production) — real checks, billable",
};

/** Invite workflow for POST /screenings. "email" (default): Sterling
 * emails the candidate the Candidate Hub link. "link": the form URL is
 * returned in the screening response for the recruiter to share. */
export type SterlingInviteMethod = "email" | "link";

export class SterlingApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
        super(detail || `Sterling API error (HTTP ${status})`);
        this.name = "SterlingApiError";
        this.status = status;
        this.detail = detail;
    }
    /** True for 429 rate-limit responses. */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
}

/** Sterling's verbatim screening statuses (see header). */
export type SterlingScreeningStatus =
    | "PreDraft"
    | "Draft"
    | "NotStarted"
    | "InProgress"
    | "Pending"
    | "Complete"
    | "ActionNeeded"
    | "ReadyForReview"
    | "Review"
    | "AdverseAction"
    | "Pre-Adverse Action Initiated"
    | "Pre-Adverse Action Sent"
    | "Adverse Action Paused"
    | "Adverse Action Cancelled"
    | "Adverse Action Resumed"
    | "Adverse Action Sent"
    | "Dispute"
    | "Archive"
    | "Hold"
    | "Pending Adjudication"
    | "Expired Invite"
    | "Deleted"
    | "Queued"
    | "Error";

/** Sterling's verbatim screening results (see header). */
export type SterlingScreeningResult =
    | "Pending"
    | "Clear"
    | "Consider"
    | "Passed"
    | "Review"
    | "Cancelled"
    | "Level1"
    | "Level2"
    | "Level3";

export type SterlingPackage = {
    id: string;
    name: string;
};

export type SterlingCandidate = {
    id: string;
    email?: string | null;
};

export type SterlingReportItem = {
    id: string;
    type: string;
    status: string | null;
    result: string | null;
    updatedAt: string | null;
};

export type SterlingScreening = {
    id: string;
    packageId: string | null;
    packageName: string | null;
    accountId: string | null;
    candidateId: string | null;
    status: string;
    subStatus: string | null;
    result: string | null;
    /** Admin interactive-summary link (links.admin.web) — the report link. */
    reportUrl: string | null;
    /** Candidate Hub form URL — only present when Sterling returns one
     * (invite.method "link"); null otherwise. Never synthesized. */
    inviteUrl: string | null;
    reportItems: SterlingReportItem[];
    submittedAt: string | null;
    updatedAt: string | null;
    estimatedCompletionTime: string | null;
};

type SterlingErrorBody = {
    errors?: { code?: string; message?: string }[];
    error?: string | { message?: string };
    message?: string;
};

function sterling_error_detail(body: unknown, status: number): string {
    if (body && typeof body === "object") {
        const b = body as SterlingErrorBody;
        const first = b.errors?.[0];
        if (first?.message) {
            return `Sterling API error (HTTP ${status}): ${first.message}${first.code ? ` [${first.code}]` : ""}`;
        }
        const raw = b.error;
        const detail = (typeof raw === "string" ? raw : raw?.message) ?? b.message;
        if (detail) return `Sterling API error (HTTP ${status}): ${detail}`;
    }
    return `Sterling API error (HTTP ${status})`;
}

async function sterling_request<T>(
    accessToken: string,
    environment: SterlingEnvironment,
    path: string,
    init?: RequestInit,
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${STERLING_API_BASES[environment]}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Sterling (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body — fall through to status handling.
    }

    if (!res.ok) {
        throw new SterlingApiError(res.status, sterling_error_detail(body, res.status));
    }

    return body as T;
}

/**
 * OAuth2 client-credentials token. POST /oauth, Basic
 * base64(client_id:client_secret), form grant_type=client_credentials.
 * Returns the bearer token (1h expiry). The caller never persists it —
 * it is fetched fresh per operation and held only in memory.
 */
export async function getSterlingAccessToken(
    clientId: string,
    clientSecret: string,
    environment: SterlingEnvironment,
): Promise<string> {
    let res: Response;
    try {
        res = await fetch(`${STERLING_API_BASES[environment]}/oauth`, {
            method: "POST",
            headers: {
                // Basic auth: base64(client_id:client_secret), per docs.
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: new URLSearchParams({ grant_type: "client_credentials" }),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Sterling (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Fall through to status handling.
    }

    if (!res.ok) {
        throw new SterlingApiError(res.status, sterling_error_detail(body, res.status));
    }

    const token = (body as { access_token?: unknown })?.access_token;
    if (typeof token !== "string" || !token) {
        throw new Error("Sterling oauth response did not contain an access_token");
    }
    return token;
}

/** Parse the GET /packages response permissively: Sterling may return
 * an array or an object wrapping one, and package ids/names under
 * `id`/`packageId` and `name`/`packageName`. */
export function parseSterlingPackages(body: unknown): SterlingPackage[] {
    const list: unknown[] = Array.isArray(body)
        ? body
        : Array.isArray((body as { packages?: unknown })?.packages)
          ? (body as { packages: unknown[] }).packages
          : Array.isArray((body as { data?: unknown })?.data)
            ? (body as { data: unknown[] }).data
            : [];
    return list
        .map((p) => {
            const rec = p as { id?: unknown; packageId?: unknown; name?: unknown; packageName?: unknown };
            const id = rec.id ?? rec.packageId;
            const name = rec.name ?? rec.packageName;
            return {
                id: typeof id === "string" || typeof id === "number" ? String(id) : "",
                name: typeof name === "string" ? name : "",
            };
        })
        .filter((p) => p.id !== "")
        .map((p) => ({ ...p, name: p.name || p.id }));
}

/** Lightweight credential check + package list. GET /packages returns
 * 200 for valid credentials (401 for invalid ones) and the account's
 * real packages. */
export async function listSterlingPackages(
    accessToken: string,
    environment: SterlingEnvironment,
): Promise<SterlingPackage[]> {
    const body = await sterling_request<unknown>(accessToken, environment, "/packages");
    return parseSterlingPackages(body);
}

function split_name(name: string): { givenName: string; familyName: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
        givenName: parts[0] ?? "",
        familyName: parts.slice(1).join(" ") || parts[0] || "",
    };
}

/**
 * Create a Sterling candidate. Only name + email + clientReferenceId
 * are sent — SSN/DOB/address are NEVER sent; Sterling collects them
 * (and the candidate's consent) in its Candidate Hub after the
 * invite. clientReferenceId is Applico's own stable reference for the
 * application (`applico-app-<id>`).
 */
export async function createSterlingCandidate(
    accessToken: string,
    environment: SterlingEnvironment,
    input: { email: string; name: string; clientReferenceId: string },
): Promise<SterlingCandidate> {
    const { givenName, familyName } = split_name(input.name);
    return sterling_request<SterlingCandidate>(accessToken, environment, "/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            givenName,
            familyName,
            email: input.email,
            clientReferenceId: input.clientReferenceId,
        }),
    });
}

/** Normalize a raw screening payload into SterlingScreening. Status,
 * result and subStatus are kept verbatim; links are read permissively
 * and only stored when Sterling actually returned them. */
export function parseSterlingScreening(body: unknown): SterlingScreening {
    const s = body as {
        id?: unknown;
        packageId?: unknown;
        packageName?: unknown;
        accountId?: unknown;
        candidateId?: unknown;
        status?: unknown;
        subStatus?: unknown;
        result?: unknown;
        links?: { admin?: { web?: unknown }; candidate?: { web?: unknown }; invite?: { web?: unknown } };
        inviteUrl?: unknown;
        inviteLink?: unknown;
        reportItems?: unknown;
        submittedAt?: unknown;
        updatedAt?: unknown;
        estimatedCompletionTime?: unknown;
    };
    const items: unknown[] = Array.isArray(s.reportItems) ? s.reportItems : [];
    return {
        id: typeof s.id === "string" || typeof s.id === "number" ? String(s.id) : "",
        packageId: typeof s.packageId === "string" || typeof s.packageId === "number" ? String(s.packageId) : null,
        packageName: typeof s.packageName === "string" ? s.packageName : null,
        accountId: typeof s.accountId === "string" || typeof s.accountId === "number" ? String(s.accountId) : null,
        candidateId: typeof s.candidateId === "string" ? s.candidateId : null,
        status: typeof s.status === "string" ? s.status : "",
        subStatus: typeof s.subStatus === "string" ? s.subStatus : null,
        result: typeof s.result === "string" && s.result !== "" ? s.result : null,
        reportUrl: typeof s.links?.admin?.web === "string" ? s.links.admin.web : null,
        // Candidate Hub form URL, only when Sterling returns one (the
        // invite.method "link" workflow). The docs name no field for
        // it, so read the documented links object permissively.
        inviteUrl:
            typeof s.links?.candidate?.web === "string"
                ? s.links.candidate.web
                : typeof s.links?.invite?.web === "string"
                  ? s.links.invite.web
                  : typeof s.inviteUrl === "string"
                    ? s.inviteUrl
                    : typeof s.inviteLink === "string"
                      ? s.inviteLink
                      : null,
        reportItems: items.map((item) => {
            const r = item as { id?: unknown; type?: unknown; status?: unknown; result?: unknown; updatedAt?: unknown };
            return {
                id: typeof r.id === "string" || typeof r.id === "number" ? String(r.id) : "",
                type: typeof r.type === "string" ? r.type : "",
                status: typeof r.status === "string" ? r.status : null,
                result: typeof r.result === "string" ? r.result : null,
                updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
            };
        }),
        submittedAt: typeof s.submittedAt === "string" ? s.submittedAt : null,
        updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : null,
        estimatedCompletionTime:
            typeof s.estimatedCompletionTime === "string" ? s.estimatedCompletionTime : null,
    };
}

/**
 * Create a screening (the order). candidateId + packageId, invite
 * workflow, and an Applico application-id custom field so the order is
 * traceable in Sterling. An idempotency-key header makes retries safe
 * (Sterling: same key returns the same screening for 24h). A 202
 * "Queued" response (async processing, enabled per account) parses
 * like a normal screening — same order/candidate IDs, status Queued.
 */
export async function createSterlingScreening(
    accessToken: string,
    environment: SterlingEnvironment,
    input: {
        candidateId: string;
        packageId: string;
        inviteMethod: SterlingInviteMethod;
        applicationId: number;
        idempotencyKey: string;
    },
): Promise<SterlingScreening> {
    const body = await sterling_request<unknown>(accessToken, environment, "/screenings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
            candidateId: input.candidateId,
            packageId: input.packageId,
            invite: { method: input.inviteMethod },
            customFields: [
                { fieldName: "Applico Application ID", fieldValue: String(input.applicationId) },
            ],
        }),
    });
    return parseSterlingScreening(body);
}

export async function getSterlingScreening(
    accessToken: string,
    environment: SterlingEnvironment,
    screeningId: string,
): Promise<SterlingScreening> {
    const body = await sterling_request<unknown>(
        accessToken,
        environment,
        `/screenings/${encodeURIComponent(screeningId)}`,
    );
    return parseSterlingScreening(body);
}
