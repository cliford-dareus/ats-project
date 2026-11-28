// ─────────────────────────────────────────────────────────────────────────────
// server/twilio.ts — Twilio Programmable SMS REST client (server-only).
//
// Auth: HTTP Basic with the Account SID as the username and the Auth Token
// as the password (`Authorization: Basic base64(sid + ":" + token)`).
// No SDK dependency — raw fetch against the 2010-04-01 API, mirroring
// server/checkr.ts.
//
// Ground truth (verified against Twilio docs/support, 2026-11-28):
//   • GET  /2010-04-01/Accounts/{AccountSid}.json — fetch the account
//     (sid, friendly_name, status, type). 200 for a valid SID/token
//     pair, 401 otherwise. Used to verify credentials at connect time.
//   • POST /2010-04-01/Accounts/{AccountSid}/Messages.json — send a
//     message. Form-encoded (NOT JSON): To, From, Body. From must be a
//     Twilio number the account owns (E.164), a short code, or an
//     alphanumeric sender ID where supported; To must be E.164.
//     Returns the message resource ({ sid: "SM…", status, … }) — the
//     initial status is usually "queued"; delivery is async (webhook
//     StatusCallback, not implemented here — see below).
//   • GET  /2010-04-01/Accounts/{AccountSid}/Messages/{Sid}.json —
//     re-read a message (status: queued / sent / delivered / failed /
//     undelivered). No live polling in this build.
//   • Errors are JSON: { code, message, more_info, status }. The
//     `message` is Twilio's real, human-readable error and is surfaced
//     verbatim — never replaced with a generic "failed". 429s are
//     surfaced, never retry-looped.
//   • Trial accounts can only text numbers verified in the Twilio
//     console — an unverified destination fails with 21211 ("not a
//     valid phone number" / unverified). That is Twilio's real error
//     and is shown as-is; it is not Applico's bug.
//
// What this client deliberately does NOT do:
//   • No Messaging Service (MG…) sender — the org configures one
//     `From` number in settings. A Messaging Service SID is a
//     follow-up if orgs need sender pooling / fallback.
//   • No MMS (MediaUrl), no WhatsApp, no Verify — plain-text SMS only.
//   • No inbound webhook receiver — STOP/START replies are not
//     processed yet, so opt-outs are recorded manually by a recruiter
//     (sms_consents source 'sms_reply' is reserved for that receiver).
//
// The Account SID and Auth Token are NEVER logged and NEVER returned
// to the client. Every failure surfaces Twilio's real error.
// ─────────────────────────────────────────────────────────────────────────────

export const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export class TwilioApiError extends Error {
    readonly status: number;
    readonly code: number | null;
    readonly detail: string;
    constructor(status: number, code: number | null, detail: string) {
        super(detail || `Twilio API error (HTTP ${status})`);
        this.name = "TwilioApiError";
        this.status = status;
        this.code = code;
        this.detail = detail;
    }
    /** True for 429 rate-limit responses. */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
}

export type TwilioAccount = {
    sid: string;
    friendly_name: string;
    status: "active" | "suspended" | "closed" | string;
    type: "Trial" | "Full" | string;
};

export type TwilioMessage = {
    sid: string;
    status: "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | string;
    to: string;
    from: string;
    body: string;
    error_code: number | null;
    error_message: string | null;
    date_created: string | null;
};

type TwilioErrorBody = {
    code?: number;
    message?: string;
    more_info?: string;
    status?: number;
};

function twilio_error_detail(body: unknown, status: number): { code: number | null; detail: string } {
    if (body && typeof body === "object") {
        const b = body as TwilioErrorBody;
        if (b.message) {
            return {
                code: typeof b.code === "number" ? b.code : null,
                detail: `Twilio API error (HTTP ${status}): ${b.message}`,
            };
        }
    }
    return { code: null, detail: `Twilio API error (HTTP ${status})` };
}

function basic_auth(accountSid: string, authToken: string): string {
    // The token is base64'd into the header only — it is never logged.
    return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function twilio_request<T>(
    accountSid: string,
    authToken: string,
    path: string,
    init?: RequestInit,
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${TWILIO_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: basic_auth(accountSid, authToken),
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Twilio (${err instanceof Error ? err.message : String(err)})`,
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body — fall through to status handling.
    }

    if (!res.ok) {
        const { code, detail } = twilio_error_detail(body, res.status);
        throw new TwilioApiError(res.status, code, detail);
    }

    return body as T;
}

/**
 * Fetch the Twilio account for this SID/token pair. A 200 proves the
 * credentials are valid; a 401 proves they are not. Returns the
 * account's friendly name, status and type (Trial vs Full) so the
 * config UI can show what the org actually connected to.
 */
export async function getTwilioAccount(
    accountSid: string,
    authToken: string,
): Promise<TwilioAccount> {
    return twilio_request<TwilioAccount>(
        accountSid,
        authToken,
        `/Accounts/${encodeURIComponent(accountSid)}.json`,
    );
}

/**
 * Send a plain-text SMS. `to` and `from` must already be E.164
 * (see normalize_phone_e164) — Twilio rejects anything else with a
 * 21211. Returns the message resource; `status` is the initial
 * "queued" state, NOT a delivery confirmation.
 */
export async function sendTwilioSms(
    accountSid: string,
    authToken: string,
    input: { to: string; from: string; body: string },
): Promise<TwilioMessage> {
    const form = new URLSearchParams({
        To: input.to,
        From: input.from,
        Body: input.body,
    });
    return twilio_request<TwilioMessage>(accountSid, authToken, `/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    });
}

/** Re-read one message's current status from Twilio. */
export async function getTwilioMessage(
    accountSid: string,
    authToken: string,
    messageSid: string,
): Promise<TwilioMessage> {
    return twilio_request<TwilioMessage>(
        accountSid,
        authToken,
        `/Accounts/${encodeURIComponent(accountSid)}/Messages/${encodeURIComponent(messageSid)}.json`,
    );
}

/**
 * Normalize a stored phone number to E.164, which Twilio requires.
 * Candidates' phones are free-form varchars ("305-555-0100",
 * "(305) 555-0100", "+1 305-555-0100"): strip formatting, assume US
 * (+1) for a bare 10-digit number, accept an 11-digit number starting
 * with 1, and pass through an explicit +country code unchanged.
 * Returns null when the value cannot be interpreted as a phone number
 * — the caller must refuse to send with a clear error, never guess.
 */
export function normalize_phone_e164(raw: string | null | undefined): string | null {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("+")) {
        const digits = trimmed.slice(1).replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return null;
}

/** Loose Account SID shape check (AC + 32 hex chars) for a clear error
 * before any network call. A wrong-length SID is a typo, not a 401. */
export function is_twilio_account_sid(value: string): boolean {
    return /^AC[0-9a-f]{32}$/i.test(value.trim());
}
