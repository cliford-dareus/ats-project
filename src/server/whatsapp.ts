// ─────────────────────────────────────────────────────────────────────────────
// server/whatsapp.ts — Twilio WhatsApp API client (server-only).
//
// TRANSPORT DECISION (see also src/plugins/providers/whatsapp.ts):
// WhatsApp goes through Twilio's WhatsApp API, NOT Meta's WhatsApp
// Business (Cloud) API directly. Reasons:
//   • One account shape for both messaging plugins: the Twilio SMS
//     plugin (built in parallel) uses the same Account SID + Auth Token
//     and the same Messages API — only the address format changes
//     (`+1555…` vs `whatsapp:+1555…`). One Twilio account, one set of
//     credentials to manage, one billing relationship.
//   • No Meta app review, no separate WhatsApp Business Account, no
//     phone-number-id / permanent-access-token management. Twilio
//     handles WhatsApp sender registration and template submission
//     (Content Template Builder) on the org's behalf.
//   • No new dependency: raw fetch with HTTP Basic auth, mirroring
//     server/checkr.ts. The `twilio` npm SDK is NOT in package.json
//     and adding it would be a new dependency for one POST.
//
// Auth: HTTP Basic, Account SID as username, Auth Token as password.
//   • Verify: GET /2010-04-01/Accounts/{AccountSid}.json — 200 proves
//     the SID/token pair; also returns the account status (active /
//     suspended / closed). This verifies the ACCOUNT, not the WhatsApp
//     sender: Twilio exposes no read-only "is this number a registered
//     WhatsApp sender" call, so a wrong or unregistered From number
//     fails at SEND time with Twilio's real error (e.g. 21211) — the
//     config UI says so instead of claiming the sender is verified.
//   • Send: POST /2010-04-01/Accounts/{AccountSid}/Messages.json,
//     form-encoded: From=whatsapp:+1…, To=whatsapp:+1…,
//     ContentSid=HX… (approved Content Template), ContentVariables
//     JSON {"1": "…", "2": "…"}. Response carries sid + status.
//
// TEMPLATE / SESSION RULES (ground truth: Twilio docs, Nov 2026):
//   • Business-initiated messages OUTSIDE the 24-hour customer-service
//     window MUST use an approved template, sent via ContentSid +
//     ContentVariables. Since 2025-04-01 a template sent as Body outside
//     the window fails with error 63016.
//   • Free-form Body is only allowed INSIDE the 24-hour window opened
//     by the customer's most recent inbound message.
//   • Applico has NO inbound WhatsApp webhook, so it can never know
//     whether the window is open. Therefore this build sends ONLY
//     templates (ContentSid) — there is deliberately NO free-form Body
//     path. A template send works business-initiated at any time, once
//     the template is approved by Meta (via Twilio's Content Template
//     Builder). Sending is never faked: the stored status is Twilio's
//     verbatim status, refreshed on demand from the card.
//
// The Auth Token is NEVER logged and NEVER returned to the client.
// Every failure surfaces Twilio's real error body/status — never a
// generic "failed". 429s are surfaced, never retry-looped.
// ─────────────────────────────────────────────────────────────────────────────

export const TWILIO_WHATSAPP_API_BASE = "https://api.twilio.com/2010-04-01";

export class TwilioApiError extends Error {
    readonly status: number;
    /** Twilio's numeric error code (e.g. 63016, 21211, 20003), when given. */
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

export type TwilioAccountInfo = {
    sid: string;
    friendlyName: string;
    status: string;
};

export type TwilioWhatsAppMessage = {
    sid: string;
    /** Twilio's verbatim status: queued / sending / sent / delivered / undelivered / failed … */
    status: string;
    to: string;
    from: string;
    errorCode: number | null;
    errorMessage: string | null;
    dateSent: string | null;
};

type TwilioErrorBody = {
    code?: number;
    message?: string;
    more_info?: string;
    status?: number;
};

function basicAuthHeader(accountSid: string, authToken: string): string {
    return `Basic ${Buffer.from(`${accountSid}:${authToken}`, "utf-8").toString("base64")}`;
}

async function parseTwilioError(res: Response): Promise<TwilioApiError> {
    let detail = `Twilio request failed (HTTP ${res.status})`;
    let code: number | null = null;
    try {
        const body = (await res.json()) as TwilioErrorBody;
        if (typeof body.code === "number") code = body.code;
        if (body.message) {
            detail = body.message;
            if (code !== null) detail = `Twilio error ${code}: ${body.message}`;
        }
    } catch {
        // Non-JSON error body — keep the HTTP status detail.
    }
    return new TwilioApiError(res.status, code, detail);
}

async function twilioFetch(
    accountSid: string,
    authToken: string,
    path: string,
    init: RequestInit,
): Promise<Response> {
    const res = await fetch(`${TWILIO_WHATSAPP_API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: basicAuthHeader(accountSid, authToken),
            ...(init.headers ?? {}),
        },
    });
    if (!res.ok) throw await parseTwilioError(res);
    return res;
}

/**
 * Normalize a stored candidate phone number to E.164 for WhatsApp.
 * Strips spaces, dashes, parentheses. A bare 10-digit US number gets
 * +1 (the org is US-based — stated as an assumption, not a fact about
 * the candidate); anything already starting with + keeps its country
 * code. Returns null when the result is not a plausible E.164 number
 * (8–15 digits) — the caller must refuse the send, not guess.
 */
export function normalizeToE164(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    if (hasPlus) {
        if (digits.length < 8 || digits.length > 15) return null;
        return `+${digits}`;
    }
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    return null;
}

/** `whatsapp:+1555…` address form Twilio requires for both endpoints. */
export function toWhatsAppAddress(e164: string): string {
    return e164.startsWith("whatsapp:") ? e164 : `whatsapp:${e164}`;
}

/**
 * Verify a Twilio Account SID + Auth Token pair against the Accounts
 * endpoint. 200 = valid credentials (also surfaces a suspended/closed
 * account). This proves the ACCOUNT — it does NOT prove the From number
 * is a registered WhatsApp sender (Twilio has no read-only check for
 * that); see the module header.
 */
export async function verifyTwilioAccount(
    accountSid: string,
    authToken: string,
): Promise<TwilioAccountInfo> {
    const res = await twilioFetch(accountSid, authToken, `/Accounts/${encodeURIComponent(accountSid)}.json`, {
        method: "GET",
    });
    const body = (await res.json()) as {
        sid?: string;
        friendly_name?: string;
        status?: string;
    };
    return {
        sid: body.sid ?? accountSid,
        friendlyName: body.friendly_name ?? "",
        status: body.status ?? "unknown",
    };
}

/**
 * Send an approved WhatsApp template via Twilio. Template-only: no
 * free-form Body is ever sent (see module header — Applico cannot know
 * whether the 24-hour session window is open). `contentVariables` maps
 * placeholder indexes ("1", "2", …) to values, in the template's
 * order; empty values are dropped before sending.
 */
export async function sendTwilioWhatsAppTemplate(args: {
    accountSid: string;
    authToken: string;
    fromE164: string;
    toE164: string;
    contentSid: string;
    contentVariables: Record<string, string>;
}): Promise<TwilioWhatsAppMessage> {
    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(args.contentVariables)) {
        if (value !== undefined && value !== "") variables[key] = value;
    }
    const form = new URLSearchParams({
        From: toWhatsAppAddress(args.fromE164),
        To: toWhatsAppAddress(args.toE164),
        ContentSid: args.contentSid,
    });
    if (Object.keys(variables).length > 0) {
        form.set("ContentVariables", JSON.stringify(variables));
    }
    const res = await twilioFetch(args.accountSid, args.authToken, `/Accounts/${encodeURIComponent(args.accountSid)}/Messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    });
    return toMessage(await res.json());
}

/** Re-read one message's live status from Twilio (on-demand refresh). */
export async function getTwilioWhatsAppMessage(args: {
    accountSid: string;
    authToken: string;
    messageSid: string;
}): Promise<TwilioWhatsAppMessage> {
    const res = await twilioFetch(
        args.accountSid,
        args.authToken,
        `/Accounts/${encodeURIComponent(args.accountSid)}/Messages/${encodeURIComponent(args.messageSid)}.json`,
        { method: "GET" },
    );
    return toMessage(await res.json());
}

function toMessage(body: {
    sid?: string;
    status?: string;
    to?: string;
    from?: string;
    error_code?: number | null;
    error_message?: string | null;
    date_sent?: string | null;
}): TwilioWhatsAppMessage {
    return {
        sid: body.sid ?? "",
        status: body.status ?? "unknown",
        to: body.to ?? "",
        from: body.from ?? "",
        errorCode: typeof body.error_code === "number" ? body.error_code : null,
        errorMessage: body.error_message ?? null,
        dateSent: body.date_sent ?? null,
    };
}
