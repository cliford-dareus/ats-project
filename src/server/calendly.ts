// ─────────────────────────────────────────────────────────────────────────────
// server/calendly.ts — Calendly API v2 client (server-only).
//
// PAT auth only: `Authorization: Bearer <personal access token>`. There is
// NO dated version header in Calendly API v2 — do not send one.
// Base URL https://api.calendly.com. Resources are full URIs
// (https://api.calendly.com/users/<uuid>), not bare IDs; the uuid helpers
// below extract the trailing segment when an endpoint needs it.
//
// Ground truth (verified against developer.calendly.com, 2026-11-28):
//   • GET  /users/me — verify a token, returns the connected user.
//   • GET  /event_types?user=<uri>&active=true — booking links
//     (scheduling_url) + duration + kind per event type.
//   • GET  /event_type_available_times?event_type=<uri>&start_time=&end_time=
//     — offered start times (max 31-day span).
//   • POST /invitees — THE way to create a booking. There is NO
//     POST /scheduled_events and NO top-level GET /invitees.
//   • GET  /scheduled_events/{uuid} — read the meeting location / join URL.
//   • POST /scheduled_events/{uuid}/cancellation — cancel a booking.
//   • POST /webhook_subscriptions (+ DELETE) — invitee.canceled etc.
//
// Plan gating (honest, not over-promised): POST /invitees is rate-limited
// by plan — Free/Trial 5 requests per user per day; Paid non-Enterprise
// 10/min, 50/hour, 100/day; Enterprise 500/min. The booking link
// (scheduling_url) is the fallback when the API cap is hit. Webhook plan
// gating is unsettled (official reference says all non-recap/routing
// events are on all plans incl. Free; third-party guides say Standard+):
// registration failure surfaces the real error and degrades gracefully.
//
// The PAT is NEVER logged and NEVER returned to the client. Every failure
// surfaces Calendly's real error body/status — never a generic "failed".
// 429s are surfaced, never retry-looped.
// ─────────────────────────────────────────────────────────────────────────────

import { db_get_org_plugin_state } from "@/server/queries/drizzle/plugin-queries";

export const CALENDLY_API_BASE = "https://api.calendly.com";

/** Scopes the recruiter must select when creating the PAT. */
export const CALENDLY_REQUIRED_SCOPES = [
    "users:read",
    "event_types:read",
    "scheduled_events:read",
    "scheduled_events:write",
    "availability:read",
    "webhooks:read",
    "webhooks:write",
] as const;

export class CalendlyApiError extends Error {
    readonly status: number;
    readonly detail: string;
    constructor(status: number, detail: string) {
        super(detail || `Calendly API error (HTTP ${status})`);
        this.name = "CalendlyApiError";
        this.status = status;
        this.detail = detail;
    }
    /** True for 429 rate-limit responses (incl. the Free-plan 5/day cap). */
    get isRateLimited(): boolean {
        return this.status === 429;
    }
}

/** Extract the trailing uuid from a Calendly resource URI. */
export function calendly_uuid_from_uri(uri: string): string {
    const trimmed = uri.replace(/\/$/, "");
    return trimmed.slice(trimmed.lastIndexOf("/") + 1);
}

type CalendlyErrorBody = {
    title?: string;
    message?: string;
    detail?: string;
    details?: { message?: string }[];
};

function calendly_error_detail(body: unknown, status: number): string {
    if (body && typeof body === "object") {
        const b = body as CalendlyErrorBody;
        const detail =
            b.detail ??
            b.message ??
            b.details?.[0]?.message ??
            b.title;
        if (detail) return `Calendly API error (HTTP ${status}): ${detail}`;
    }
    return `Calendly API error (HTTP ${status})`;
}

async function calendly_request<T>(
    pat: string,
    path: string,
    init?: RequestInit
): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${CALENDLY_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${pat}`,
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        throw new Error(
            `Could not reach Calendly (${err instanceof Error ? err.message : String(err)})`
        );
    }

    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // Non-JSON body (e.g. an empty 204) — fall through to status handling.
    }

    if (!res.ok) {
        // Never include the PAT; the body is Calendly's own error text.
        throw new CalendlyApiError(res.status, calendly_error_detail(body, res.status));
    }
    return body as T;
}

// ── Types (subset of the fields Applico actually reads) ───────────────────────

export type CalendlyUser = {
    uri: string;
    name: string;
    slug: string;
    email: string;
    timezone: string;
    current_organization: string;
};

export type CalendlyEventType = {
    uri: string;
    name: string;
    active: boolean;
    slug: string;
    scheduling_url: string;
    duration: number;
    kind: "solo" | "group" | "round_robin" | string;
    description_plain?: string | null;
    custom_questions?: { name: string; type: string; required: boolean }[];
};

export type CalendlyAvailableTime = {
    status: "available";
    start_time: string;
    scheduling_url?: string;
};

export type CalendlyInvitee = {
    uri: string;
    name: string;
    email: string;
    status: "active" | "canceled";
    event: string;
    cancel_url: string;
    reschedule_url: string;
    timezone?: string;
};

export type CalendlyScheduledEventLocation = {
    type: string;
    join_url?: string;
    location?: string;
    status?: string;
};

export type CalendlyScheduledEvent = {
    uri: string;
    name: string;
    status: "active" | "canceled";
    start_time: string;
    end_time: string;
    event_type: string;
    location?: CalendlyScheduledEventLocation | null;
    invitees_counter?: { total: number; active: number; limit: number };
};

export type CalendlyWebhookSubscription = {
    uri: string;
    callback_url: string;
    created_at: string;
    state: "active" | "disabled";
    events: string[];
    scope: "user" | "organization";
    user?: string;
    organization?: string;
    signing_key?: string;
};

type CollectionResponse<T> = {
    collection: T[];
    pagination: {
        count: number;
        next_page: string | null;
        next_page_token: string | null;
        previous_page: string | null;
        previous_page_token: string | null;
    };
};

/** Follow cursor pagination until the collection is exhausted (count ≤ 100/page). */
async function calendly_list_all<T>(
    pat: string,
    path: string
): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = path;
    // Safety bound: Calendly caps pages at 100 items; 50 pages is far
    // beyond any org's event-type list — this only guards a runaway cursor.
    for (let pages = 0; pages < 50 && next; pages++) {
        const page: CollectionResponse<T> = await calendly_request<
            CollectionResponse<T>
        >(pat, next);
        out.push(...(page.collection ?? []));
        const token: string | null = page.pagination?.next_page_token ?? null;
        if (!token) break;
        const full: string =
            page.pagination.next_page ??
            `${CALENDLY_API_BASE}${path.split("?")[0]}?page_token=${token}`;
        next = full.startsWith(CALENDLY_API_BASE)
            ? full.slice(CALENDLY_API_BASE.length)
            : full;
    }
    return out;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/** GET /users/me — verify a PAT; returns the connected Calendly user. */
export async function getCalendlyCurrentUser(pat: string): Promise<CalendlyUser> {
    const { resource } = await calendly_request<{ resource: CalendlyUser }>(
        pat,
        "/users/me"
    );
    return resource;
}

/** GET /event_types — active event types for the connected user (all pages). */
export async function listCalendlyEventTypes(
    pat: string,
    userUri: string
): Promise<CalendlyEventType[]> {
    const types = await calendly_list_all<CalendlyEventType>(
        pat,
        `/event_types?user=${encodeURIComponent(userUri)}&active=true&count=100`
    );
    return types.filter((t) => t.active);
}

/**
 * GET /event_type_available_times — offered start times for one event type
 * in [startTime, endTime). Calendly caps the span at 31 days.
 */
export async function getCalendlyEventTypeAvailableTimes(
    pat: string,
    eventTypeUri: string,
    startTime: string,
    endTime: string
): Promise<CalendlyAvailableTime[]> {
    const query = new URLSearchParams({
        event_type: eventTypeUri,
        start_time: startTime,
        end_time: endTime,
    });
    const { collection } = await calendly_request<
        CollectionResponse<CalendlyAvailableTime>
    >(pat, `/event_type_available_times?${query.toString()}`);
    return collection ?? [];
}

/** POST /invitees — create a booking. The invitee response carries the event URI. */
export async function createCalendlyInvitee(
    pat: string,
    args: {
        eventTypeUri: string;
        startTime: string; // UTC ISO, trailing Z
        inviteeName: string;
        inviteeEmail: string;
        inviteeTimezone: string;
    }
): Promise<CalendlyInvitee> {
    const { resource } = await calendly_request<{ resource: CalendlyInvitee }>(
        pat,
        "/invitees",
        {
            method: "POST",
            body: JSON.stringify({
                event_type: args.eventTypeUri,
                start_time: args.startTime,
                invitee: {
                    name: args.inviteeName,
                    email: args.inviteeEmail,
                    timezone: args.inviteeTimezone,
                },
            }),
        }
    );
    return resource;
}

/** GET /scheduled_events/{uuid} — read the meeting location / join URL. */
export async function getCalendlyScheduledEvent(
    pat: string,
    eventUri: string
): Promise<CalendlyScheduledEvent> {
    const uuid = calendly_uuid_from_uri(eventUri);
    const { resource } = await calendly_request<{
        resource: CalendlyScheduledEvent;
    }>(pat, `/scheduled_events/${uuid}`);
    return resource;
}

/** POST /scheduled_events/{uuid}/cancellation — cancel a booking. */
export async function cancelCalendlyScheduledEvent(
    pat: string,
    eventUri: string,
    reason?: string
): Promise<CalendlyScheduledEvent> {
    const uuid = calendly_uuid_from_uri(eventUri);
    const { resource } = await calendly_request<{
        resource: CalendlyScheduledEvent;
    }>(pat, `/scheduled_events/${uuid}/cancellation`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? "Cancelled by recruiter" }),
    });
    return resource;
}

/**
 * POST /webhook_subscriptions — register a webhook. Scope is always
 * `user` (an org-owner/admin PAT could use `organization`, but a
 * non-admin PAT cannot — `user` always works).
 */
export async function createCalendlyWebhookSubscription(
    pat: string,
    args: {
        url: string;
        events: string[];
        userUri: string;
        signingKey: string;
    }
): Promise<CalendlyWebhookSubscription> {
    const { resource } = await calendly_request<{
        resource: CalendlyWebhookSubscription;
    }>(pat, "/webhook_subscriptions", {
        method: "POST",
        body: JSON.stringify({
            url: args.url,
            events: args.events,
            user: args.userUri,
            scope: "user",
            signing_key: args.signingKey,
        }),
    });
    return resource;
}

/** DELETE /webhook_subscriptions/{uuid} — best-effort removal on disconnect. */
export async function deleteCalendlyWebhookSubscription(
    pat: string,
    subscriptionUri: string
): Promise<void> {
    const uuid = calendly_uuid_from_uri(subscriptionUri);
    await calendly_request<unknown>(pat, `/webhook_subscriptions/${uuid}`, {
        method: "DELETE",
    });
}

// ── Org credential loading ───────────────────────────────────────────────────

/**
 * The org's stored Calendly PAT (decrypted server-side) plus the saved
 * connected-user config. Returns null when Calendly is not installed /
 * has no usable key — callers must treat that as "not connected", never
 * as an error to retry. Never returns a masked value as a key: a masked
 * credential is not usable, so a masked-only state counts as no key.
 */
export async function getCalendlyPatForOrg(orgId: string): Promise<{
    pat: string;
    userUri: string | null;
    userName: string | null;
    userEmail: string | null;
    webhookSubscriptionUri: string | null;
    webhookSigningKey: string | null;
} | null> {
    const state = await db_get_org_plugin_state(orgId);
    const plugin = state.installed.find((p) => p.id === "calendly");
    const apiKey = plugin?.settings.credentials?.apiKey ?? "";
    if (!apiKey || apiKey.startsWith("••••")) return null;
    const config = plugin?.settings.config ?? {};
    const webhookSigningKey =
        plugin?.settings.credentials?.webhookSigningKey ?? "";
    return {
        pat: apiKey,
        userUri: typeof config.userUri === "string" ? config.userUri : null,
        userName:
            typeof config.userName === "string" ? config.userName : null,
        userEmail:
            typeof config.userEmail === "string" ? config.userEmail : null,
        webhookSubscriptionUri:
            typeof config.webhookSubscriptionUri === "string"
                ? config.webhookSubscriptionUri
                : null,
        webhookSigningKey:
            webhookSigningKey && !webhookSigningKey.startsWith("••••")
                ? webhookSigningKey
                : null,
    };
}

/** True when the org has a usable stored Calendly PAT. */
export async function isCalendlyConnectedForOrg(orgId: string): Promise<boolean> {
    return (await getCalendlyPatForOrg(orgId)) !== null;
}
