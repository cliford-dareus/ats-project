"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/calendly-actions.ts — Calendly scheduling + webhooks.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow) — no client-supplied orgId is ever trusted. The PAT
// never leaves the server: the modal and config UI call these actions,
// never Calendly directly.
//
// Permissions: scheduling / availability / event-type reads need
// `interview:schedule` OR `plugin:manage` (the settings page user may not
// hold interview:schedule); webhook enable/disable is `plugin:manage`.
// Booking failures surface Calendly's real error and create NOTHING —
// no fake interview row, no scheduling URL stored as a join link.
// ─────────────────────────────────────────────────────────────────────────────

import { randomBytes } from "crypto";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
    CalendlyApiError,
    cancelCalendlyScheduledEvent,
    createCalendlyInvitee,
    createCalendlyWebhookSubscription,
    deleteCalendlyWebhookSubscription,
    getCalendlyEventTypeAvailableTimes,
    getCalendlyPatForOrg,
    getCalendlyScheduledEvent,
    getCalendlyCurrentUser,
    listCalendlyEventTypes,
    type CalendlyEventType,
} from "@/server/calendly";
import { db_get_organization_plugins_raw } from "@/server/queries/drizzle/plugin-queries";
import { update_organization_plugins } from "@/server/queries/drizzle/organization";
import {
    create_interview_db,
    get_interview_by_application_db,
    get_interview_details_for_application_db,
} from "@/server/queries/drizzle/interview";
import { getAuthOrThrow, hasPermission, requirePermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import { orgPluginSettingsSchema } from "@/zod";
import { send_candidate_interview_email } from "@/server/actions/interview-actions";

export type CalendlyEventTypeDTO = {
    uri: string;
    name: string;
    schedulingUrl: string;
    duration: number;
    kind: string;
};

const to_event_type_dto = (t: CalendlyEventType): CalendlyEventTypeDTO => ({
    uri: t.uri,
    name: t.name,
    schedulingUrl: t.scheduling_url,
    duration: t.duration,
    kind: t.kind,
});

/** Scheduling reads are allowed for schedulers AND plugin managers. */
async function can_use_calendly_scheduling(): Promise<boolean> {
    return (
        (await hasPermission("interview:schedule")) ||
        (await hasPermission("plugin:manage"))
    );
}

function calendly_app_base_url(): string | null {
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return base || null;
}

export const CALENDLY_WEBHOOK_EVENTS = ["invitee.created", "invitee.canceled"] as const;

// ── Event types ──────────────────────────────────────────────────────────────

/**
 * The org's real Calendly event types (live from the API) + the connected
 * user, for the schedule modal and the settings page. `connected: false`
 * means no usable PAT is stored — never an error to retry.
 */
export async function list_calendly_event_types_action(): Promise<{
    success: boolean;
    connected: boolean;
    userName: string | null;
    userEmail: string | null;
    eventTypes: CalendlyEventTypeDTO[];
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    if (!(await can_use_calendly_scheduling())) {
        return {
            success: false,
            connected: false,
            userName: null,
            userEmail: null,
            eventTypes: [],
            message: "Missing permission: interview:schedule",
        };
    }

    const creds = await getCalendlyPatForOrg(orgId);
    if (!creds) {
        return {
            success: false,
            connected: false,
            userName: null,
            userEmail: null,
            eventTypes: [],
            message: "Calendly is not connected for this organization",
        };
    }

    try {
        // The stored userUri may predate a re-connect; fall back to
        // /users/me when it is missing so the list still works.
        let userUri = creds.userUri;
        let userName = creds.userName;
        let userEmail = creds.userEmail;
        if (!userUri) {
            const me = await getCalendlyCurrentUser(creds.pat);
            userUri = me.uri;
            userName = me.name;
            userEmail = me.email;
        }
        const types = await listCalendlyEventTypes(creds.pat, userUri);
        return {
            success: true,
            connected: true,
            userName,
            userEmail,
            eventTypes: types.map(to_event_type_dto),
            message: "Event types loaded",
        };
    } catch (err) {
        return {
            success: false,
            connected: false,
            userName: null,
            userEmail: null,
            eventTypes: [],
            message: (err as Error).message || "Failed to load Calendly event types",
        };
    }
}

// ── Availability ─────────────────────────────────────────────────────────────

const calendlyAvailabilitySchema = z.object({
    eventTypeUri: z.string().min(1),
    start_at: z.coerce.date(),
    end_at: z.coerce.date(),
});

/**
 * Pre-flight: is the chosen slot actually offered by this event type?
 * Calendly's available-times endpoint returns offered start times; the
 * chosen start must match one exactly. A slot that is not offered BLOCKS
 * scheduling — there is no "schedule anyway" on the Calendly path, the
 * API call would fail.
 */
export async function check_calendly_availability_action(
    unsafeInput: z.infer<typeof calendlyAvailabilitySchema>
): Promise<{ available: boolean; message: string }> {
    const { orgId } = await getAuthOrThrow();
    if (!(await can_use_calendly_scheduling())) {
        return { available: false, message: "Missing permission: interview:schedule" };
    }
    const parsed = calendlyAvailabilitySchema.safeParse(unsafeInput);
    if (!parsed.success) {
        return { available: false, message: parsed.error.issues[0]?.message ?? "Invalid time range" };
    }
    const { eventTypeUri, start_at, end_at } = parsed.data;
    if (end_at <= start_at) {
        return { available: false, message: "End time must be after start time" };
    }

    const creds = await getCalendlyPatForOrg(orgId);
    if (!creds) {
        return { available: false, message: "Calendly is not connected for this organization" };
    }

    try {
        // Offered times are queried over the 24h window starting at the
        // chosen slot — the chosen start must appear in it exactly.
        const windowEnd = new Date(start_at.getTime() + 24 * 60 * 60 * 1000);
        const offered = await getCalendlyEventTypeAvailableTimes(
            creds.pat,
            eventTypeUri,
            start_at.toISOString(),
            windowEnd.toISOString()
        );
        const wanted = start_at.getTime();
        const match = offered.some(
            (slot) => new Date(slot.start_time).getTime() === wanted
        );
        return match
            ? { available: true, message: "That time is available on Calendly" }
            : {
                  available: false,
                  message:
                      "Calendly doesn't offer that exact time for this event type. Pick one of the offered times, or send the candidate the booking link instead.",
              };
    } catch (err) {
        return {
            available: false,
            message: (err as Error).message || "Failed to check Calendly availability",
        };
    }
}

// ── Booking ──────────────────────────────────────────────────────────────────

const createCalendlyInterviewSchema = z.object({
    applicationId: z.number(),
    job_id: z.number(),
    job_name: z.string().min(1),
    candidate_name: z.string().min(1),
    candidate_email: z.string().email(),
    start_at: z.coerce.date(),
    end_at: z.coerce.date(),
    type: z.enum(["VIDEO", "PHONE", "ONSITE"]),
    location: z.string().min(1),
    interviewer_ids: z.array(z.string()).optional(),
    eventTypeUri: z.string().min(1),
    eventTypeName: z.string().min(1),
    eventTypeSchedulingUrl: z.string().url().optional(),
});

/**
 * Book a Calendly interview (server-side only — the PAT never leaves the
 * server). Flow: duplicate guard → availability pre-flight → POST
 * /invitees → GET the scheduled event for its meeting join URL → create
 * the interview row (scheduling_provider='calendly', status SCHEDULE) →
 * invite email with the real join / manage links.
 *
 * On ANY failure before the row is created, nothing is created. If the
 * DB insert fails AFTER the Calendly booking exists, the booking is
 * cancelled best-effort so no orphaned Calendly event survives.
 * If POST /invitees fails (e.g. the Free-plan 5/day cap), the real
 * Calendly error is surfaced and the modal offers the event type's
 * scheduling_url as a copyable fallback — no fake row is created for it.
 */
export const create_calendly_interview_action = async (
    unsafeData: z.infer<typeof createCalendlyInterviewSchema>
) => {
    const { userId, orgId } = await auth();
    const parsed = createCalendlyInterviewSchema.safeParse(unsafeData);
    if (!userId || !orgId || !parsed.success) {
        throw new Error(
            parsed.success ? "Unauthorized" : parsed.error.issues[0]?.message
        );
    }

    const allowed = await hasPermission("interview:schedule");
    if (!allowed) throw new Error("Missing permission: interview:schedule");

    const data = parsed.data;
    if (data.end_at <= data.start_at) {
        throw new Error("The interview must end after it starts.");
    }

    const existing = await get_interview_by_application_db(data.applicationId);
    if (existing) {
        throw new Error("Application already has an interview");
    }

    const creds = await getCalendlyPatForOrg(orgId);
    if (!creds) {
        throw new Error("Calendly is not connected for this organization");
    }

    // Availability pre-flight — a slot Calendly doesn't offer blocks the
    // booking (the API would fail); there is no "schedule anyway" here.
    const availability = await check_calendly_availability_action({
        eventTypeUri: data.eventTypeUri,
        start_at: data.start_at,
        end_at: data.end_at,
    });
    if (!availability.available) {
        throw new Error(availability.message);
    }

    // Create the booking. The invitee response carries the event URI and
    // the candidate-facing cancel/reschedule URLs.
    const invitee = await createCalendlyInvitee(creds.pat, {
        eventTypeUri: data.eventTypeUri,
        startTime: data.start_at.toISOString(),
        inviteeName: data.candidate_name,
        inviteeEmail: data.candidate_email,
        // Candidates carry no timezone in Applico; all times are UTC.
        inviteeTimezone: "UTC",
    });

    // Read the scheduled event for its meeting location / join URL.
    // Best-effort: the booking already exists, so a failed read must not
    // orphan it — the row is created with no join URL and the email says
    // so honestly instead.
    let joinUrl: string | undefined;
    try {
        const event = await getCalendlyScheduledEvent(creds.pat, invitee.event);
        const location = event.location;
        if (location?.join_url) joinUrl = location.join_url;
        else if (location?.type === "physical" && location.location) joinUrl = undefined;
    } catch (err) {
        console.error(
            "[calendly] Could not read scheduled event for join URL:",
            err instanceof Error ? err.message : String(err)
        );
    }

    let interviewId: number | null;
    try {
        interviewId = await create_interview_db(
            {
                applicationId: data.applicationId,
                job_id: data.job_id,
                start_at: data.start_at,
                end_at: data.end_at,
                link: joinUrl,
                location: data.location,
                type: data.type,
                status: "SCHEDULE",
                interviewer_ids: data.interviewer_ids ?? [],
                scheduling_provider: "calendly",
                calendly_event_type_uri: data.eventTypeUri,
                calendly_event_type_name: data.eventTypeName,
                calendly_event_uri: invitee.event,
                calendly_invitee_uri: invitee.uri,
            },
            orgId
        );
    } catch (err) {
        // The Calendly booking exists but Applico has no row for it —
        // cancel it best-effort so the slot isn't held by a ghost booking.
        try {
            await cancelCalendlyScheduledEvent(
                creds.pat,
                invitee.event,
                "Applico could not save the interview"
            );
        } catch {
            // The orphan is logged by the API error below; the recruiter
            // can cancel it from Calendly.
            console.error(
                `[calendly] Orphaned Calendly booking ${invitee.event} after a failed interview save`
            );
        }
        throw err;
    }

    if (typeof interviewId === "number") {
        const details = await get_interview_details_for_application_db(
            data.applicationId,
            orgId
        ).catch(() => null);
        await record_activity({
            action: "interview.scheduled",
            entity_type: "interview",
            entity_id: interviewId,
            summary: details?.candidate_name
                ? `Scheduled interview with ${details.candidate_name} for ${details.job_name ?? "a role"} via Calendly (${data.eventTypeName})`
                : "Scheduled interview via Calendly",
        });
    }

    // Invite email (best-effort — the booking already exists, so a mail
    // failure is logged, never thrown). The join URL is included only
    // when Calendly returned one; otherwise the candidate gets the
    // booking link + the cancel/reschedule URLs Calendly issued.
    let email_sent = false;
    try {
        const details = await get_interview_details_for_application_db(
            data.applicationId,
            orgId
        );
        if (details?.candidate_email) {
            const extraLines = joinUrl
                ? `Join link: ${joinUrl}\nReschedule or cancel: ${invitee.reschedule_url}`
                : `Book or manage this interview here: ${data.eventTypeSchedulingUrl ?? invitee.reschedule_url}\nReschedule: ${invitee.reschedule_url}\nCancel: ${invitee.cancel_url}`;
            email_sent = await send_candidate_interview_email({
                orgId,
                templateId: "interview_invite",
                candidateEmail: details.candidate_email,
                candidateName: details.candidate_name,
                candidateId: details.candidate_id,
                jobName: details.job_name,
                start_at: data.start_at,
                end_at: data.end_at,
                meetingLink: joinUrl,
                location: data.location,
                extraText: extraLines,
                sentBy: userId,
            });
        }
    } catch (error) {
        console.error(
            "[calendly] Failed to send Calendly invite email:",
            error
        );
    }

    return {
        success: true as const,
        interviewId,
        eventUri: invitee.event,
        joinUrl: joinUrl ?? null,
        schedulingUrl: data.eventTypeSchedulingUrl ?? null,
        cancelUrl: invitee.cancel_url,
        rescheduleUrl: invitee.reschedule_url,
        email_sent,
    };
};

// ── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * Register the Calendly webhook subscription (explicit recruiter step in
 * the config UI). Scope is always `user` — an org-owner/admin PAT could
 * use `organization`, but a non-admin PAT cannot, and `user` always
 * works. The signing key is generated server-side, stored ENCRYPTED as
 * a credential, and passed as `signing_key` at creation.
 *
 * If registration fails (e.g. plan-gating 403), the real Calendly error
 * is returned and the connection keeps working WITHOUT webhooks — the
 * UI says so plainly.
 */
export async function enable_calendly_webhooks_action(): Promise<{
    success: boolean;
    subscriptionUri?: string;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    const baseUrl = calendly_app_base_url();
    if (!baseUrl) {
        return {
            success: false,
            message:
                "NEXT_PUBLIC_APP_URL is not set, so Calendly has no public callback URL to call. Set it and try again — the Calendly connection still works without webhooks.",
        };
    }

    const creds = await getCalendlyPatForOrg(orgId);
    if (!creds) {
        return { success: false, message: "Calendly is not connected for this organization" };
    }
    if (!creds.userUri) {
        return {
            success: false,
            message:
                "The connected Calendly user is unknown — reconnect Calendly, then enable webhooks.",
        };
    }

    const signingKey = randomBytes(32).toString("hex");
    try {
        const subscription = await createCalendlyWebhookSubscription(creds.pat, {
            url: `${baseUrl}/api/webhooks/calendly`,
            events: [...CALENDLY_WEBHOOK_EVENTS],
            userUri: creds.userUri,
            signingKey,
        });

        // Persist: signing key as an ENCRYPTED credential, subscription
        // URI + enabled flag as plain config. Existing config is merged,
        // never replaced wholesale.
        const raw = await db_get_organization_plugins_raw(orgId);
        const existing = raw.settings?.calendly ?? {};
        const nextSettings = {
            ...existing,
            active: true,
            credentials: {
                ...(existing.credentials ?? {}),
                webhookSigningKey: signingKey,
            },
            config: {
                ...(existing.config ?? {}),
                webhookSubscriptionUri: subscription.uri,
                webhookEnabled: true,
            },
        };
        const validated = orgPluginSettingsSchema("calendly").safeParse(nextSettings);
        if (!validated.success) {
            throw new Error(
                validated.error.issues[0]?.message ?? "Invalid Calendly settings"
            );
        }
        await update_organization_plugins(orgId, "calendly", validated.data);

        return {
            success: true,
            subscriptionUri: subscription.uri,
            message: "Webhooks enabled — cancellations made in Calendly will sync back to Applico.",
        };
    } catch (err) {
        const message =
            err instanceof CalendlyApiError
                ? err.message
                : (err as Error).message || "Failed to enable Calendly webhooks";
        return {
            success: false,
            message: `${message} The Calendly connection still works without webhooks — cancellations made in Calendly won't sync back; cancel from Applico instead.`,
        };
    }
}

/**
 * Remove the webhook subscription (best-effort delete at Calendly) and
 * clear the stored subscription URI + signing key. A Calendly-side
 * delete failure never blocks the local clear.
 */
export async function disable_calendly_webhooks_action(): Promise<{
    success: boolean;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    const raw = await db_get_organization_plugins_raw(orgId);
    const existing = raw.settings?.calendly ?? {};
    const subscriptionUri =
        typeof existing.config?.webhookSubscriptionUri === "string"
            ? existing.config.webhookSubscriptionUri
            : null;

    const creds = await getCalendlyPatForOrg(orgId);
    if (creds && subscriptionUri) {
        try {
            await deleteCalendlyWebhookSubscription(creds.pat, subscriptionUri);
        } catch (err) {
            console.error(
                "[calendly] Failed to delete webhook subscription (continuing with local clear):",
                err instanceof Error ? err.message : String(err)
            );
        }
    }

    const nextSettings = {
        ...existing,
        credentials: {
            ...(existing.credentials ?? {}),
            webhookSigningKey: "",
        },
        config: {
            ...(existing.config ?? {}),
            webhookSubscriptionUri: "",
            webhookEnabled: false,
        },
    };
    const validated = orgPluginSettingsSchema("calendly").safeParse(nextSettings);
    if (!validated.success) {
        return {
            success: false,
            message: validated.error.issues[0]?.message ?? "Invalid Calendly settings",
        };
    }
    await update_organization_plugins(orgId, "calendly", validated.data);
    return { success: true, message: "Webhooks disabled." };
}

/** Webhook state for the config UI (no secrets — the signing key is never returned). */
export async function get_calendly_webhook_status_action(): Promise<{
    enabled: boolean;
    subscriptionUri: string | null;
    callbackUrl: string | null;
    appUrlConfigured: boolean;
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");
    const raw = await db_get_organization_plugins_raw(orgId);
    const config = raw.settings?.calendly?.config ?? {};
    const baseUrl = calendly_app_base_url();
    return {
        enabled: config.webhookEnabled === true,
        subscriptionUri:
            typeof config.webhookSubscriptionUri === "string" &&
            config.webhookSubscriptionUri !== ""
                ? config.webhookSubscriptionUri
                : null,
        callbackUrl: baseUrl ? `${baseUrl}/api/webhooks/calendly` : null,
        appUrlConfigured: baseUrl !== null,
    };
}
