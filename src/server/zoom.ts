// ─────────────────────────────────────────────────────────────────────────────
// server/zoom.ts — Zoom REST API v2 client (server-only).
//
// Auth: Server-to-Server OAuth (account-level). The org creates a
// Server-to-Server OAuth app in the Zoom Marketplace (Develop → Build App),
// adds the scopes below, and activates it. Applico stores the three
// credentials (Account ID, Client ID, Client Secret) encrypted and mints
// a fresh 1-hour access token per call — no redirect URI, no user consent
// flow, no refresh token to store. JWT auth is deprecated by Zoom
// (sunset June 2023) and is NOT used.
//
// Ground truth (verified against Zoom's own docs / developer forum,
// 2026-11-28):
//   • POST https://zoom.us/oauth/token — grant_type=account_credentials,
//     account_id in the body, Basic base64(client_id:client_secret).
//     Returns access_token (expires_in 3600) + scope.
//   • GET  /v2/users/me — verify credentials, returns the connected user
//     (the Zoom account owner — the "me" for a Server-to-Server app).
//   • POST /v2/users/me/meetings — create a scheduled meeting
//     (type 2, topic, start_time ISO, duration minutes, settings).
//     201 returns { id, join_url, password, ... }.
//   • PATCH /v2/meetings/{meetingId} — move a meeting (start_time,
//     duration, topic). 204.
//   • DELETE /v2/meetings/{meetingId} — delete a meeting. 204; 404 when
//     it is already gone.
//   • Scopes the app needs: user:read:admin, meeting:write:admin,
//     meeting:read:admin.
//
// Honest limits (stated in the config UI, not just in code):
//   • Meetings are hosted by the Zoom account owner ("me") — the user
//     who created the Marketplace app — not by the individual recruiter
//     who schedules the interview. Interviewers are recorded on the
//     interview and emailed, but they don't host their own Zoom meeting.
//   • A Server-to-Server app is account-scoped: it works for the org's
//     OWN Zoom account once activated. No public listing / publish step
//     is needed to use it here — publishing is only for distributing
//     the app to OTHER Zoom accounts.
//   • Zoom meeting ids can exceed 10 digits — they are stored as
//     STRINGS (interviews.zoom_meeting_id varchar(64)), never ints.
//   • On a Basic (free) Zoom account, meetings with 3+ participants are
//     capped at 40 minutes — Zoom enforces that, Applico doesn't.
//
// Credentials are NEVER logged and NEVER returned to the client. Every
// failure surfaces Zoom's real error body/status — never a generic
// "failed". 429s are surfaced, never retry-looped.
// ─────────────────────────────────────────────────────────────────────────────

import { db_get_org_plugin_state } from "@/server/queries/drizzle/plugin-queries";

export const ZOOM_API_BASE = "https://api.zoom.us/v2";
export const ZOOM_OAUTH_TOKEN_URL = "https://zoom.us/oauth/token";

/** Scopes the org must select on the Server-to-Server OAuth app. */
export const ZOOM_REQUIRED_SCOPES = [
    "user:read:admin",
    "meeting:write:admin",
    "meeting:read:admin",
] as const;

export class ZoomApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
        super(detail || `Zoom API error (HTTP ${status})`);
        this.name = "ZoomApiError";
        this.status = status;
        this.detail = detail;
    }
    /** True for 429 rate-limit responses. */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
    /** True when the meeting is already gone (DELETE/PATCH on a dead id). */
    get isNotFound(): boolean {
        return this.status === 404;
    }
}

export type ZoomCredentials = {
    accountId: string;
    clientId: string;
    clientSecret: string;
};

type ZoomErrorBody = {
    code?: number;
    message?: string;
    error?: string;
    error_description?: string;
};

function zoom_error_detail(body: unknown, status: number): string {
    if (body && typeof body === "object") {
        const b = body as ZoomErrorBody;
        const detail = b.message ?? b.error_description ?? b.error;
        if (detail) return `Zoom API error (HTTP ${status}): ${detail}`;
        if (typeof b.code === "number") {
            return `Zoom API error (HTTP ${status}, code ${b.code})`;
        }
    }
    return `Zoom API error (HTTP ${status})`;
}

async function zoom_request<T>(
    accessToken: string,
    path: string,
    init?: RequestInit
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${ZOOM_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Zoom (${err instanceof Error ? err.message : String(err)})`
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body (e.g. an empty 204) — fall through to status handling.
    }

    if (!res.ok) {
        // Never include credentials; the body is Zoom's own error text.
        throw new ZoomApiError(res.status, zoom_error_detail(body, res.status));
    }
    return body as T;
}

// ── Types (subset of the fields Applico actually reads) ───────────────────────

export type ZoomUser = {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    type?: number;
    timezone?: string;
    account_id?: string;
};

export type ZoomMeeting = {
    id: number;
    topic: string;
    type: number;
    status?: string;
    start_time?: string;
    duration?: number;
    timezone?: string;
    join_url: string;
    start_url?: string;
    password?: string;
    host_id?: string;
    host_email?: string;
};

// ── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Mint a Server-to-Server access token (1 hour). Tokens are minted
 * per call, never stored — the client id/secret stay encrypted at rest
 * and only ever travel to zoom.us over HTTPS.
 */
export async function getZoomAccessToken(
    creds: ZoomCredentials
): Promise<string> {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString(
        "base64"
    );
    let res: Response;
    try {
        res = await fetch(ZOOM_OAUTH_TOKEN_URL, {
            method: "POST",
            headers: {
                Authorization: `Basic ${basic}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "account_credentials",
                account_id: creds.accountId,
            }).toString(),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Zoom (${err instanceof Error ? err.message : String(err)})`
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Fall through to the status check below.
    }
    if (!res.ok) {
        // The token endpoint answers with { error, reason } on bad
        // credentials — surface Zoom's real words, never the secret.
        throw new ZoomApiError(res.status, zoom_error_detail(body, res.status));
    }
    const token = (body as { access_token?: unknown } | null)?.access_token;
    if (typeof token !== "string" || !token) {
        throw new Error("Zoom returned no access token");
    }
    return token;
}

/** Mint a token and run one API call with it. */
async function zoom_with_token<T>(
    creds: ZoomCredentials,
    run: (accessToken: string) => Promise<T>
): Promise<T> {
    const accessToken = await getZoomAccessToken(creds);
    return run(accessToken);
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** GET /users/me — verify credentials; returns the connected Zoom user. */
export async function getZoomCurrentUser(
    creds: ZoomCredentials
): Promise<ZoomUser> {
    return zoom_with_token(creds, (token) =>
        zoom_request<ZoomUser>(token, "/users/me")
    );
}

/** POST /users/me/meetings — create a scheduled meeting (type 2). */
export async function createZoomMeeting(
    creds: ZoomCredentials,
    args: {
        topic: string;
        startTime: string; // UTC ISO, trailing Z
        durationMinutes: number;
        agenda?: string;
    }
): Promise<ZoomMeeting> {
    return zoom_with_token(creds, (token) =>
        zoom_request<ZoomMeeting>(token, "/users/me/meetings", {
            method: "POST",
            body: JSON.stringify({
                topic: args.topic,
                type: 2,
                start_time: args.startTime,
                duration: args.durationMinutes,
                timezone: "UTC",
                ...(args.agenda ? { agenda: args.agenda } : {}),
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    mute_upon_entry: false,
                    waiting_room: false,
                },
            }),
        })
    );
}

/** PATCH /meetings/{meetingId} — move a meeting to a new time. 204. */
export async function updateZoomMeeting(
    creds: ZoomCredentials,
    meetingId: string,
    args: {
        topic?: string;
        startTime?: string; // UTC ISO, trailing Z
        durationMinutes?: number;
    }
): Promise<void> {
    await zoom_with_token(creds, (token) =>
        zoom_request<unknown>(
            token,
            `/meetings/${encodeURIComponent(meetingId)}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    ...(args.topic ? { topic: args.topic } : {}),
                    ...(args.startTime ? { start_time: args.startTime } : {}),
                    ...(args.durationMinutes !== undefined
                        ? { duration: args.durationMinutes }
                        : {}),
                }),
            }
        )
    );
}

/** DELETE /meetings/{meetingId} — delete a meeting. 204; 404 if already gone. */
export async function deleteZoomMeeting(
    creds: ZoomCredentials,
    meetingId: string
): Promise<void> {
    await zoom_with_token(creds, (token) =>
        zoom_request<unknown>(
            token,
            `/meetings/${encodeURIComponent(meetingId)}`,
            { method: "DELETE" }
        )
    );
}

/** GET /meetings/{meetingId} — read a meeting (join URL, status). */
export async function getZoomMeeting(
    creds: ZoomCredentials,
    meetingId: string
): Promise<ZoomMeeting> {
    return zoom_with_token(creds, (token) =>
        zoom_request<ZoomMeeting>(
            token,
            `/meetings/${encodeURIComponent(meetingId)}`
        )
    );
}

// ── Org credential loading ───────────────────────────────────────────────────

/**
 * The org's stored Zoom Server-to-Server credentials (decrypted
 * server-side) plus the saved connected-user config. Returns null when
 * Zoom is not installed / has no usable credentials — callers must treat
 * that as "not connected", never as an error to retry. Never returns a
 * masked value as a credential: a masked-only state counts as no key.
 */
export async function getZoomCredentialsForOrg(orgId: string): Promise<{
    creds: ZoomCredentials;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
} | null> {
    const state = await db_get_org_plugin_state(orgId);
    const plugin = state.installed.find((p) => p.id === "zoom");
    const credentials = plugin?.settings.credentials ?? {};
    const accountId = credentials.accountId ?? "";
    const clientId = credentials.clientId ?? "";
    const clientSecret = credentials.clientSecret ?? "";
    if (
        !accountId ||
        !clientId ||
        !clientSecret ||
        accountId.startsWith("••••") ||
        clientId.startsWith("••••") ||
        clientSecret.startsWith("••••")
    ) {
        return null;
    }
    const config = plugin?.settings.config ?? {};
    return {
        creds: { accountId, clientId, clientSecret },
        userId: typeof config.userId === "string" ? config.userId : null,
        userName:
            typeof config.userName === "string" ? config.userName : null,
        userEmail:
            typeof config.userEmail === "string" ? config.userEmail : null,
    };
}

/** True when the org has usable stored Zoom credentials. */
export async function isZoomConnectedForOrg(orgId: string): Promise<boolean> {
    return (await getZoomCredentialsForOrg(orgId)) !== null;
}
