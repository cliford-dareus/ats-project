"use server";

import React from "react";
import { z } from "zod";
import { render } from "@react-email/components";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { newInterviewSchema } from "@/zod";
import InterviewHoldTemplate from "@/emails/interview_hold_template";
import { sendEmail } from "@/lib/resend";
import { rate_limit, get_client_ip } from "@/lib/rate-limit";
import {
    create_interview_db,
    create_interview_hold_db,
    get_interview_by_application_db,
    get_interview_by_hold_token,
    get_interview_by_id_db,
    get_interview_details_for_application_db,
    cancel_interview_db,
    mark_hold_confirmed_db,
    mark_hold_released_db,
    update_interview_schedule_db,
} from "../queries/drizzle/interview";
import { db_get_org_members_by_ids } from "../queries/drizzle/organization";
import { create_notifications_db } from "../queries/mongo/notifications";
import { db_get_org_plugin_state } from "../queries/drizzle/plugin-queries";
import {
    confirmCalendarHold,
    createCalendarEvent,
    createTentativeHoldEvent,
    releaseCalendarHold,
    updateCalendarEvent,
} from "../google-calenda";
import { check_calendar_conflicts } from "../calendar-availability";
import {
    CalendlyApiError,
    cancelCalendlyScheduledEvent,
    createCalendlyInvitee,
    getCalendlyEventTypeAvailableTimes,
    getCalendlyPatForOrg,
    getCalendlyScheduledEvent,
} from "../calendly";
import {
    ZoomApiError,
    deleteZoomMeeting,
    getZoomCredentialsForOrg,
    updateZoomMeeting,
} from "../zoom";
import { format_interview_time } from "../holds/hold-service";
import { get_org_profile, render_org_template, send_org_email } from "../email/org-mailer";
import {
    assertInterviewBelongsToOrg,
    canCancelInterview,
    canScheduleInterview,
    hasPermission,
} from "../permissions";
import { record_activity } from "@/server/activity/record-activity";
import { fire_interview_webhooks } from "@/lib/webhooks/enqueue";

const holdSchema = z.object({
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
    interviewer_emails: z.array(z.string().email()).optional(),
    hold_hours: z.number().min(1).max(168).optional(),
});

function hold_public_base_url() {
    if (process.env.NEXT_PUBLIC_MARKETING_URL) {
        return process.env.NEXT_PUBLIC_MARKETING_URL.replace(/\/$/, "");
    }
    if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
        return `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    return "";
}

// ── Public hold-route hardening ───────────────────────────────────────────────

/** Hold tokens are randomBytes(24) hex — reject anything else before hitting the DB. */
const HOLD_TOKEN_RE = /^[0-9a-f]{48}$/;
const is_valid_hold_token = (token: string) => HOLD_TOKEN_RE.test(token);

/** Generic message for invalid/expired/used links — no enumeration hints. */
const HOLD_INVALID_ERROR = "This link is invalid or expired.";
const HOLD_RATE_LIMIT_ERROR =
    "Too many attempts. Please try again in a few minutes.";
const HOLD_CALENDAR_CONFIRM_ERROR =
    "We couldn't confirm this interview on the calendar. Please try again or contact the recruiter.";
const HOLD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Per-IP (enumeration defense) + per-token (abuse defense) limits. */
async function check_hold_action_rate_limit(token: string): Promise<boolean> {
    const ip = await get_client_ip();
    return (
        await rate_limit(`hold:ip:${ip}`, 60, HOLD_RATE_LIMIT_WINDOW_MS) &&
        await rate_limit(`hold:token:${token}`, 10, HOLD_RATE_LIMIT_WINDOW_MS)
    );
}

type HoldRow = NonNullable<
    Awaited<ReturnType<typeof get_interview_by_hold_token>>
>;

/**
 * Best-effort calendar release. Returns true when it's safe to update the DB
 * hold status: no calendar event to release, release succeeded, or the
 * failure is permanent (owner disconnected Google — retrying can't help).
 * Returns false only for transient failures, so the caller can leave the
 * hold TENTATIVE for the expiry worker to retry.
 */
async function try_release_hold_calendar(row: HoldRow): Promise<boolean> {
    if (!row.calendar_event_id || !row.calendar_owner_id) return true;
    const released = await releaseCalendarHold({
        clerkUserId: row.calendar_owner_id,
        eventId: row.calendar_event_id,
    });
    if (released.success) return true;
    console.error(
        `[interview-hold] Failed to release calendar hold for interview ${row.interview_id}: ${released.error}`
    );
    return !released.retryable;
}

// ── D1 shared helpers ─────────────────────────────────────────────────────────

/** Hold outcomes after which an interview is dead — reschedule/cancel must refuse. */
const DEAD_HOLD_STATUSES = ["DECLINED", "EXPIRED", "RELEASED"] as const;

function is_dead_interview(row: {
    status: string | null;
    hold_status: string | null;
}): boolean {
    if (row.status === "CANCELLED") return true;
    return (
        row.hold_status != null &&
        (DEAD_HOLD_STATUSES as readonly string[]).includes(row.hold_status)
    );
}

/** Interviewer Clerk ids → their emails (org members only; unresolvable ones skipped). */
async function resolve_interviewer_emails(
    orgId: string,
    interviewer_ids: string[] | null
): Promise<string[]> {
    if (!interviewer_ids?.length) return [];
    try {
        const members = await db_get_org_members_by_ids(orgId, interviewer_ids);
        return members
            .map((m) => m.email)
            .filter((email): email is string => !!email);
    } catch (error) {
        console.error("[interview] Failed to resolve interviewer emails:", error);
        return [];
    }
}

/**
 * Candidate-facing interview email via the org mailer (system template +
 * CommunicationLog). Best-effort: returns false instead of throwing, so a
 * mail failure never fails the interview operation that already happened.
 *
 * `extraText` is appended verbatim to the rendered body — the Calendly
 * path uses it for the join / manage-booking links, because the system
 * interview_invite template has no {{meetingLink}} placeholder (the
 * Google path relies on the calendar invite carrying the Meet link).
 */
export async function send_candidate_interview_email(args: {
    orgId: string;
    templateId: "interview_invite" | "interview_rescheduled" | "interview_cancelled";
    candidateEmail: string;
    candidateName: string | null;
    candidateId?: number | null;
    jobName: string | null;
    start_at: Date | null;
    end_at: Date | null;
    meetingLink?: string;
    location?: string;
    cancelReason?: string;
    senderName?: string;
    sentBy?: string;
    extraText?: string;
}): Promise<boolean> {
    try {
        const org = await get_org_profile(args.orgId);
        const rendered = await render_org_template(args.orgId, args.templateId, {
            candidateName: args.candidateName?.split(" ")[0] ?? "there",
            jobTitle: args.jobName ?? "the role",
            interviewDate: format_interview_time(args.start_at, args.end_at),
            interviewLocation: args.location ?? "",
            meetingLink: args.meetingLink ?? "",
            cancelReason: args.cancelReason ?? "Not specified",
            senderName: args.senderName ?? "",
            companyName: org?.name ?? "Applico",
        });
        const text = args.extraText
            ? `${rendered.text}\n\n${args.extraText}`
            : rendered.text;
        const result = await send_org_email({
            orgId: args.orgId,
            to: args.candidateEmail,
            toName: args.candidateName ?? undefined,
            subject: rendered.subject,
            text,
            type: args.templateId,
            templateId: rendered.templateId,
            candidateId: args.candidateId ?? undefined,
            sentBy: args.sentBy,
            authorName: args.senderName,
        });
        return result.success;
    } catch (error) {
        console.error(
            `[interview] Failed to send ${args.templateId} email:`,
            error
        );
        return false;
    }
}

// ── D2: hold-owner notices ────────────────────────────────────────────────────

/**
 * Notify the recruiter who placed a hold that the candidate confirmed or
 * declined it: in-app notification + email. Best-effort: never fails the
 * confirm/decline itself — every failure is logged and swallowed.
 */
async function notify_hold_owner(args: {
    orgId: string;
    ownerId: string;
    applicationId: number | null;
    candidateName: string | null;
    jobName: string | null;
    start_at: Date | null;
    end_at: Date | null;
    kind: "interview_confirmed" | "interview_declined";
    templateId: "interview_confirmed" | "interview_declined";
    meetingLink?: string;
}): Promise<void> {
    const when = format_interview_time(args.start_at, args.end_at);
    const who = args.candidateName ?? "The candidate";
    const what = args.jobName ?? "the role";
    const verb =
        args.kind === "interview_confirmed" ? "confirmed" : "declined";

    try {
        await create_notifications_db(args.orgId, [args.ownerId], {
            kind: args.kind,
            title: `Interview ${verb}: ${who} — ${what}`,
            body: `${who} ${verb} the interview for ${what} on ${when}.`,
            link: args.applicationId
                ? `/applications/${args.applicationId}`
                : undefined,
        });
    } catch (error) {
        console.error("[interview-hold] Failed to notify hold owner (in-app):", error);
    }

    try {
        const clerk = await clerkClient();
        const owner = await clerk.users.getUser(args.ownerId);
        const email = owner.primaryEmailAddress?.emailAddress;
        if (!email) return;
        const org = await get_org_profile(args.orgId);
        const rendered = await render_org_template(
            args.orgId,
            args.templateId,
            {
                candidateName: who,
                jobTitle: what,
                interviewDate: when,
                meetingLink: args.meetingLink ?? "",
                companyName: org?.name ?? "Applico",
            }
        );
        await send_org_email({
            orgId: args.orgId,
            to: email,
            toName: owner.firstName ?? undefined,
            subject: rendered.subject,
            text: rendered.text,
            type: args.templateId,
            templateId: rendered.templateId,
        });
    } catch (error) {
        console.error("[interview-hold] Failed to notify hold owner (email):", error);
    }
}

// ── Hold confirmation email (Resend) ──────────────────────────────────────────

function format_interview_range(start_at: Date, end_at: Date): string {
    const date_opts: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    };
    const time_opts: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    };
    const date = start_at.toLocaleDateString("en-US", date_opts);
    const start = start_at.toLocaleTimeString("en-US", time_opts);
    const end = end_at.toLocaleTimeString("en-US", time_opts);
    return `${date} · ${start} – ${end} UTC`;
}

/**
 * Resend settings for the org, mirroring the Resend plugin provider
 * (src/plugins/providers/resend.ts): org plugin config first, env fallback
 * (RESEND_API_KEY / RESEND_FROM_EMAIL, see .env.example).
 */
async function get_resend_settings(orgId: string): Promise<{
    apiKey: string;
    from: string;
    companyName: string;
} | null> {
    try {
        const state = await db_get_org_plugin_state(orgId);
        const resend = state.installed.find(
            (plugin) => plugin.id === "resend"
        );
        const apiKey =
            resend?.settings.credentials?.apiKey ||
            process.env.RESEND_API_KEY ||
            "";
        const companyName =
            (resend?.settings.config?.companyName as string) || "Applico";
        const fromAddress = resend?.settings.config?.fromAddress as
            | string
            | undefined;
        if (!apiKey) return null;
        const from = fromAddress
            ? `${companyName} Recruiting <${fromAddress}>`
            : process.env.RESEND_FROM_EMAIL ||
              `${companyName} Recruiting <no-reply@aplico.online>`;
        return { apiKey, from, companyName };
    } catch (error) {
        console.error(
            "[interview-hold] Failed to load Resend settings:",
            error
        );
        return null;
    }
}

/**
 * Email the candidate their confirm link. Best-effort: returns false instead
 * of throwing so a mail failure never blocks the hold itself — the recruiter
 * still gets the copyable link in the schedule modal.
 */
async function send_hold_confirmation_email(args: {
    orgId: string;
    candidate_email: string;
    candidate_name: string;
    job_name: string;
    start_at: Date;
    end_at: Date;
    hold_expires_at: Date;
    confirm_url: string;
}): Promise<boolean> {
    try {
        const settings = await get_resend_settings(args.orgId);
        if (!settings) {
            console.warn(
                "[interview-hold] Resend not configured for org; skipping hold email."
            );
            return false;
        }

        const html = await render(
            React.createElement(InterviewHoldTemplate, {
                candidateName: args.candidate_name,
                jobTitle: args.job_name,
                interviewDateTime: format_interview_range(
                    args.start_at,
                    args.end_at
                ),
                holdExpiresAt: `${args.hold_expires_at.toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "UTC",
                })} UTC`,
                confirmUrl: args.confirm_url,
                companyName: settings.companyName,
            })
        );

        await sendEmail({
            apiKey: settings.apiKey,
            from: settings.from,
            to: args.candidate_email,
            subject: `Confirm your interview for ${args.job_name}`,
            html,
            tags: [
                { name: "event", value: "interview_hold_created" },
                { name: "org", value: args.orgId },
            ],
        });
        return true;
    } catch (error) {
        console.error("[interview-hold] Failed to send hold email:", error);
        return false;
    }
}

export const create_interview_action = async (
    unsafeData: z.infer<typeof newInterviewSchema>
) => {
    const { userId, orgId } = await auth();
    const { success, data } = await newInterviewSchema.spa(unsafeData);

    if (!userId || !success || !orgId) {
        throw new Error("Invalid data");
    }

    const allowed = await canScheduleInterview();
    if (!allowed) throw new Error("Missing permission: interview:schedule");

    const result = await create_interview_db(data, orgId);

    // The interview row now exists — resolve candidate/job names for the
    // log entry (the same lookup the invite email below uses).
    if (typeof result === "number") {
        const details = await get_interview_details_for_application_db(
            data.applicationId,
            orgId
        ).catch(() => null);
        await record_activity({
            action: "interview.scheduled",
            entity_type: "interview",
            entity_id: result,
            summary: details?.candidate_name
                ? `Scheduled interview with ${details.candidate_name} for ${details.job_name ?? "a role"}`
                : "Scheduled interview",
        });
    }

    // D7-server: the direct path used to send the candidate nothing (only
    // the hold path emailed). Best-effort invite — creation already
    // succeeded, so a mail failure is logged, never thrown.
    try {
        const details = await get_interview_details_for_application_db(
            data.applicationId,
            orgId
        );
        if (details?.candidate_email) {
            let senderName = "";
            try {
                const clerk = await clerkClient();
                const me = await clerk.users.getUser(userId);
                senderName = [me.firstName, me.lastName]
                    .filter(Boolean)
                    .join(" ");
            } catch {
                // Sender name is cosmetic; the invite goes out without it.
            }
            await send_candidate_interview_email({
                orgId,
                templateId: "interview_invite",
                candidateEmail: details.candidate_email,
                candidateName: details.candidate_name,
                candidateId: details.candidate_id,
                jobName: details.job_name,
                start_at: data.start_at,
                end_at: data.end_at,
                location: data.location,
                senderName,
                sentBy: userId,
            });
        }
    } catch (error) {
        console.error(
            "[interview] Failed to send direct-schedule invite email:",
            error
        );
    }

    // ── Outbound webhooks (feat/plugin-webhooks) ─────────────────────────
    // interview_scheduled never reaches the BullMQ worker, so the
    // delivery jobs are enqueued here, from the action that created the
    // interview. Fire-and-forget: the helper never throws, so a webhook
    // failure can never break the booking.
    if (typeof result === "number") {
        void fire_interview_webhooks(orgId, result, "interview_scheduled");
    }

    return result;
};

export const create_interview_hold_action = async (
    unsafeData: z.infer<typeof holdSchema>
) => {
    const { userId, orgId } = await auth();
    const parsed = holdSchema.safeParse(unsafeData);

    if (!userId || !orgId || !parsed.success) {
        throw new Error(
            parsed.success ? "Unauthorized" : parsed.error.issues[0]?.message
        );
    }

    const allowed = await canScheduleInterview();
    if (!allowed) throw new Error("Missing permission: interview:schedule");

    const data = parsed.data;

    // Check for an existing interview BEFORE touching the calendar, so a
    // duplicate never orphans a tentative calendar event. The DB layer
    // re-checks inside create_interview_hold_db as the race guard.
    const existing = await get_interview_by_application_db(data.applicationId);
    if (existing) {
        throw new Error("Application already has an interview");
    }

    const calendar = await createTentativeHoldEvent({
        clerkUserId: userId,
        payload: {
            summary: `Interview: ${data.candidate_name} — ${data.job_name}`,
            description: `Tentative interview hold for ${data.candidate_name} (${data.candidate_email}) applying to ${data.job_name}.`,
            startDateTime: data.start_at.toISOString(),
            endDateTime: data.end_at.toISOString(),
            interviewerEmails: data.interviewer_emails,
            candidateEmail: data.candidate_email,
        },
    });

    if (!calendar.success) {
        throw new Error(calendar.error || "Could not place calendar hold");
    }

    let hold: Awaited<ReturnType<typeof create_interview_hold_db>>;
    try {
        hold = await create_interview_hold_db(
            {
                applicationId: data.applicationId,
                job_id: data.job_id,
                start_at: data.start_at,
                end_at: data.end_at,
                type: data.type,
                location: data.location,
                calendar_event_id: calendar.eventId,
                calendar_owner_id: userId,
                interviewer_ids: data.interviewer_ids,
                link: calendar.meetLink,
                hold_hours: data.hold_hours ?? 48,
            },
            orgId
        );
    } catch (error) {
        // DB insert failed after the calendar hold was placed — release the
        // orphaned event so the slot isn't blocked by a hold that doesn't exist.
        if (calendar.eventId) {
            await releaseCalendarHold({
                clerkUserId: userId,
                eventId: calendar.eventId,
            });
        }
        throw error;
    }

    const confirm_url = `${hold_public_base_url()}/interview/hold/${hold.hold_token}`;

    const email_sent = await send_hold_confirmation_email({
        orgId,
        candidate_email: data.candidate_email,
        candidate_name: data.candidate_name,
        job_name: data.job_name,
        start_at: data.start_at,
        end_at: data.end_at,
        hold_expires_at: hold.hold_expires_at,
        confirm_url,
    });

    return {
        success: true as const,
        hold_token: hold.hold_token,
        hold_expires_at: hold.hold_expires_at,
        confirm_url,
        calendar_event_id: calendar.eventId,
        email_sent,
    };
};

export const confirm_interview_hold_action = async (token: string) => {
    if (!is_valid_hold_token(token)) {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    if (!(await check_hold_action_rate_limit(token))) {
        return { success: false as const, error: HOLD_RATE_LIMIT_ERROR };
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    if (row.hold_status === "CONFIRMED") {
        return {
            success: true as const,
            already: true as const,
            message: "Already confirmed",
        };
    }

    if (row.hold_status !== "TENTATIVE") {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    if (row.hold_expires_at && new Date(row.hold_expires_at) < new Date()) {
        // Lazy-expire: release the calendar hold first; only mark expired
        // when the release is done (or can't be retried) so the expiry
        // worker can retry transient calendar failures.
        if (await try_release_hold_calendar(row)) {
            await mark_hold_released_db(
                row.interview_id,
                row.organization,
                "EXPIRED"
            );
        }
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    // Calendar first: the DB must not say CONFIRMED if the calendar update failed.
    let calendar_event_id = row.calendar_event_id ?? undefined;
    let meet_link = row.link ?? undefined;

    if (row.calendar_event_id && row.calendar_owner_id && row.candidate_email) {
        const confirmed = await confirmCalendarHold({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
            payload: {
                summary: `Interview: ${row.candidate_name} — ${row.job_name}`,
                description: "Candidate confirmed this interview slot.",
                candidateEmail: row.candidate_email,
                meetLink: row.link ?? undefined,
            },
        });

        if (confirmed.success) {
            calendar_event_id = confirmed.eventId;
            meet_link = confirmed.meetLink ?? meet_link;
        } else if (!row.start_at || !row.end_at) {
            return { success: false as const, error: HOLD_CALENDAR_CONFIRM_ERROR };
        } else {
            // The tentative event may have been deleted (or the patch failed) —
            // recreate it as a fresh confirmed event rather than diverging.
            const recreated = await createCalendarEvent({
                clerkUserId: row.calendar_owner_id,
                payload: {
                    summary: `Interview: ${row.candidate_name} — ${row.job_name}`,
                    description: "Candidate confirmed this interview slot.",
                    startDateTime: row.start_at.toISOString(),
                    endDateTime: row.end_at.toISOString(),
                    attendeeEmail: row.candidate_email,
                },
            });

            if (!recreated.success) {
                return {
                    success: false as const,
                    error: HOLD_CALENDAR_CONFIRM_ERROR,
                };
            }

            calendar_event_id = recreated.eventId;
            meet_link = recreated.meetLink ?? meet_link;
        }
    }

    await mark_hold_confirmed_db(row.interview_id, row.organization, {
        calendar_event_id,
        link: meet_link,
    });

    // D2: notify the recruiter who placed the hold. Best-effort — the
    // confirm already landed, so this never throws.
    if (row.calendar_owner_id) {
        await notify_hold_owner({
            orgId: row.organization,
            ownerId: row.calendar_owner_id,
            applicationId: row.applications_id,
            candidateName: row.candidate_name,
            jobName: row.job_name,
            start_at: row.start_at,
            end_at: row.end_at,
            kind: "interview_confirmed",
            templateId: "interview_confirmed",
            meetingLink: meet_link,
        });
    }

    return {
        success: true as const,
        already: false as const,
        start_at: row.start_at,
        end_at: row.end_at,
        type: row.type,
        job_name: row.job_name,
        link: meet_link,
    };
};

export const decline_interview_hold_action = async (token: string) => {
    if (!is_valid_hold_token(token)) {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    if (!(await check_hold_action_rate_limit(token))) {
        return { success: false as const, error: HOLD_RATE_LIMIT_ERROR };
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    if (row.hold_status === "DECLINED") {
        return { success: true as const, already: true as const };
    }

    if (row.hold_status !== "TENTATIVE") {
        return { success: false as const, error: HOLD_INVALID_ERROR };
    }

    // Release the calendar hold first. On a transient failure, fail closed so
    // the candidate can retry (and the expiry worker picks the hold up later);
    // a permanent failure (owner disconnected Google) still records the decline.
    if (!(await try_release_hold_calendar(row))) {
        return {
            success: false as const,
            error: "We couldn't release the hold right now. Please try again or contact the recruiter.",
        };
    }

    await mark_hold_released_db(row.interview_id, row.organization, "DECLINED");

    // D2: notify the recruiter who placed the hold. Best-effort — the
    // decline already landed, so this never throws.
    if (row.calendar_owner_id) {
        await notify_hold_owner({
            orgId: row.organization,
            ownerId: row.calendar_owner_id,
            applicationId: row.applications_id,
            candidateName: row.candidate_name,
            jobName: row.job_name,
            start_at: row.start_at,
            end_at: row.end_at,
            kind: "interview_declined",
            templateId: "interview_declined",
        });
    }

    return { success: true as const };
};

export const get_hold_public_details_action = async (token: string) => {
    if (!is_valid_hold_token(token)) return null;

    // Page loads are the enumeration vector (a valid token renders, an
    // invalid one 404s), so rate-limit them per IP; a limited load looks
    // exactly like an invalid token.
    const ip = await get_client_ip();
    if (!rate_limit(`hold:page:${ip}`, 60, HOLD_RATE_LIMIT_WINDOW_MS)) {
        return null;
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) return null;

    return {
        candidate_name: row.candidate_name,
        company_name: row.organization,
        job_name: row.job_name,
        start_at: row.start_at,
        end_at: row.end_at,
        type: row.type,
        location: row.locations,
        hold_status: row.hold_status,
        hold_expires_at: row.hold_expires_at,
        expired:
            !!row.hold_expires_at && new Date(row.hold_expires_at) < new Date(),
    };
};

// ── D1: reschedule + cancel ───────────────────────────────────────────────────

const rescheduleInterviewSchema = z.object({
    interviewId: z.number(),
    start_at: z.coerce.date(),
    end_at: z.coerce.date(),
    type: z.enum(["VIDEO", "PHONE", "ONSITE"]).optional(),
    location: z.string().min(1).optional(),
});

export const reschedule_interview_action = async (
    unsafeData: z.infer<typeof rescheduleInterviewSchema>
) => {
    const { userId, orgId } = await auth();
    const parsed = rescheduleInterviewSchema.safeParse(unsafeData);

    if (!userId || !orgId || !parsed.success) {
        throw new Error(
            parsed.success ? "Unauthorized" : parsed.error.issues[0]?.message
        );
    }

    const allowed = await canScheduleInterview();
    if (!allowed) throw new Error("Missing permission: interview:schedule");

    const { interviewId, start_at, end_at } = parsed.data;
    if (end_at <= start_at) {
        throw new Error("The interview must end after it starts.");
    }

    await assertInterviewBelongsToOrg(interviewId, orgId);
    const row = await get_interview_by_id_db(interviewId, orgId);
    if (!row) throw new Error("Interview not found");

    if (is_dead_interview(row)) {
        throw new Error(
            "This interview can no longer be rescheduled. Schedule a new interview instead."
        );
    }

    const type = parsed.data.type ?? row.type ?? "VIDEO";
    const location = parsed.data.location ?? row.locations;
    const summary = `Interview: ${row.candidate_name ?? "Candidate"} — ${row.job_name ?? "Interview"}`;
    let calendar_event_id = row.calendar_event_id ?? undefined;
    let meet_link = row.link ?? undefined;
    let calendly_event_uri = row.calendly_event_uri ?? undefined;
    let calendly_invitee_uri = row.calendly_invitee_uri ?? undefined;
    // Reschedule email: Calendly join/manage links ride in extraText —
    // the system template has no {{meetingLink}} placeholder.
    let reschedule_extra_text: string | undefined;

    if (row.scheduling_provider === "zoom") {
        // Zoom interviews move the Zoom meeting (PATCH start_time +
        // duration) — the meeting id and join URL are unchanged, so the
        // candidate keeps the same link. A failed move surfaces the real
        // Zoom error and changes NOTHING.
        if (!row.zoom_meeting_id) {
            throw new Error(
                "This Zoom interview has no meeting on file, so it can't be moved. Cancel it and schedule a new one instead."
            );
        }
        const creds = await getZoomCredentialsForOrg(orgId);
        if (!creds) {
            throw new Error(
                "Zoom is not connected — reconnect it to reschedule this interview"
            );
        }
        try {
            await updateZoomMeeting(creds.creds, row.zoom_meeting_id, {
                topic: summary,
                startTime: start_at.toISOString(),
                durationMinutes: Math.round(
                    (end_at.getTime() - start_at.getTime()) / 60000
                ),
            });
        } catch (err) {
            if (err instanceof ZoomApiError && err.isNotFound) {
                throw new Error(
                    "That Zoom meeting no longer exists in Zoom, so it can't be moved. Cancel this interview here and schedule a new one instead."
                );
            }
            throw new Error(
                err instanceof ZoomApiError
                    ? err.message
                    : `Could not move the Zoom meeting: ${(err as Error).message}`
            );
        }
        // Join link is unchanged (same meeting id) — meet_link already
        // holds row.link.
    } else if (row.scheduling_provider === "calendly") {
        // Calendly interviews NEVER hit the Google gate above: no Google
        // Calendar is involved in them at all. The old booking is
        // cancelled via the Calendly API, then a new invitee booking is
        // created at the new time on the same event type. A failed cancel
        // surfaces the real Calendly error and changes NOTHING.
        if (!row.calendly_event_uri || !row.calendly_event_type_uri) {
            throw new Error(
                "This Calendly interview has no booking on file, so it can't be moved. Cancel it and schedule a new one instead."
            );
        }
        if (!row.candidate_email || !row.candidate_name) {
            throw new Error(
                "The candidate has no name or email on file, so the Calendly booking can't be recreated."
            );
        }
        const creds = await getCalendlyPatForOrg(orgId);
        if (!creds) {
            throw new Error(
                "Calendly is not connected — reconnect it to reschedule this interview"
            );
        }

        // Pre-flight: the new slot must be offered by the event type.
        const windowEnd = new Date(start_at.getTime() + 24 * 60 * 60 * 1000);
        const offered = await getCalendlyEventTypeAvailableTimes(
            creds.pat,
            row.calendly_event_type_uri,
            start_at.toISOString(),
            windowEnd.toISOString()
        );
        if (
            !offered.some(
                (slot) => new Date(slot.start_time).getTime() === start_at.getTime()
            )
        ) {
            throw new Error(
                "Calendly doesn't offer that exact time for this event type. Pick one of the offered times instead."
            );
        }

        try {
            await cancelCalendlyScheduledEvent(
                creds.pat,
                row.calendly_event_uri,
                "Rescheduled in Applico"
            );
        } catch (err) {
            // Fail closed: the old booking is still live, the DB row is
            // untouched, and the recruiter sees Calendly's real error.
            throw new Error(
                err instanceof CalendlyApiError
                    ? err.message
                    : `Could not cancel the Calendly booking: ${(err as Error).message}`
            );
        }

        let newInvitee;
        try {
            newInvitee = await createCalendlyInvitee(creds.pat, {
                eventTypeUri: row.calendly_event_type_uri,
                startTime: start_at.toISOString(),
                inviteeName: row.candidate_name,
                inviteeEmail: row.candidate_email,
                inviteeTimezone: "UTC",
            });
        } catch (err) {
            // The old booking is already cancelled at this point — say so
            // plainly, with the real error, so the recruiter knows to
            // re-book (cancel this row first, then schedule a new one)
            // instead of assuming the interview still exists in Calendly.
            const detail =
                err instanceof CalendlyApiError
                    ? err.message
                    : (err as Error).message;
            throw new Error(
                `${detail} The previous Calendly booking was already cancelled, so this interview has no live Calendly booking — cancel it here and schedule a new one.`
            );
        }

        calendly_event_uri = newInvitee.event;
        calendly_invitee_uri = newInvitee.uri;
        try {
            const event = await getCalendlyScheduledEvent(
                creds.pat,
                newInvitee.event
            );
            meet_link = event.location?.join_url ?? undefined;
        } catch {
            // Best-effort join-URL read (same as booking): the booking
            // exists, so keep going without a join link rather than fail.
            meet_link = undefined;
        }
        reschedule_extra_text = meet_link
            ? `Join link: ${meet_link}\nReschedule or cancel: ${newInvitee.reschedule_url}`
            : `Reschedule: ${newInvitee.reschedule_url}\nCancel: ${newInvitee.cancel_url}`;
    } else {
    // Server-side availability re-check against the scheduler's own calendar,
    // excluding this interview's own event. (Google path only — Calendly
    // interviews branch above and never reach this gate.)
    const availability = await check_calendar_conflicts(
        userId,
        start_at,
        end_at,
        row.calendar_event_id ?? undefined
    );
    if (!availability.connected) {
        throw new Error(
            "Google Calendar not connected — reconnect to reschedule"
        );
    }
    if (availability.conflicts.length > 0) {
        const list = availability.conflicts
            .map(
                (c) =>
                    `${format_interview_time(c.start, c.end)}${c.summary ? ` (${c.summary})` : ""}`
            )
            .join("; ");
        throw new Error(`That time conflicts with your calendar: ${list}`);
    }

    if (row.hold_status === "TENTATIVE") {
        // Tentative hold: release the old event and place a new tentative
        // one at the new time. The hold_token and hold_expires_at live in
        // the DB row and are kept untouched.
        if (row.calendar_event_id && row.calendar_owner_id) {
            const released = await releaseCalendarHold({
                clerkUserId: row.calendar_owner_id,
                eventId: row.calendar_event_id,
            });
            if (!released.success && released.retryable) {
                throw new Error(
                    "We couldn't release the old calendar hold. Please try again."
                );
            }
            // Permanent failure (owner disconnected Google): the event is
            // gone or unreachable — proceed with the new hold.
            if (!released.success) {
                console.error(
                    `[interview] Could not release old hold event for interview ${interviewId}: ${released.error}`
                );
            }
        }

        const created = await createTentativeHoldEvent({
            clerkUserId: row.calendar_owner_id ?? userId,
            payload: {
                summary,
                description: `Tentative interview hold for ${row.candidate_name ?? "the candidate"} (${row.candidate_email ?? ""}) applying to ${row.job_name ?? "the role"}.`,
                startDateTime: start_at.toISOString(),
                endDateTime: end_at.toISOString(),
                interviewerEmails: await resolve_interviewer_emails(
                    orgId,
                    row.interviewer_ids
                ),
                candidateEmail: row.candidate_email ?? undefined,
            },
        });
        if (!created.success) {
            throw new Error(
                created.error || "Could not place a calendar hold for the new time"
            );
        }
        calendar_event_id = created.eventId;
        meet_link = created.meetLink ?? meet_link;
    } else if (row.calendar_event_id && row.calendar_owner_id) {
        // Confirmed hold or direct-scheduled interview: patch the event.
        const updated = await updateCalendarEvent({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
            payload: {
                startDateTime: start_at.toISOString(),
                endDateTime: end_at.toISOString(),
                summary,
            },
        });

        if (updated.success) {
            calendar_event_id = updated.eventId;
            meet_link = updated.meetLink ?? meet_link;
        } else if (updated.notFound) {
            // The event was deleted — recreate it as a fresh confirmed event.
            if (!row.candidate_email) {
                throw new Error(
                    "The calendar event no longer exists and the candidate has no email on file, so it can't be recreated."
                );
            }
            const recreated = await createCalendarEvent({
                clerkUserId: row.calendar_owner_id,
                payload: {
                    summary,
                    description: `Interview for ${row.candidate_name ?? "the candidate"} applying to ${row.job_name ?? "the role"}.`,
                    startDateTime: start_at.toISOString(),
                    endDateTime: end_at.toISOString(),
                    attendeeEmail: row.candidate_email,
                    interviewerEmails: await resolve_interviewer_emails(
                        orgId,
                        row.interviewer_ids
                    ),
                },
            });
            if (!recreated.success) {
                throw new Error(
                    recreated.error || "Could not recreate the calendar event"
                );
            }
            calendar_event_id = recreated.eventId;
            meet_link = recreated.meetLink ?? meet_link;
        } else {
            throw new Error(updated.error || "Could not move the calendar event");
        }
    }
    // No calendar event on file (direct-scheduled interviews don't store
    // one): the DB row is still moved. A stale Google event, if one exists,
    // can't be located from here.
    } // end Google path — the Calendly branch above sets its own URIs/link

    await update_interview_schedule_db(interviewId, orgId, {
        start_at,
        end_at,
        type,
        location,
        calendar_event_id: calendar_event_id ?? null,
        link: meet_link ?? null,
        calendly_event_uri: calendly_event_uri ?? null,
        calendly_invitee_uri: calendly_invitee_uri ?? null,
    });

    await record_activity({
        action: "interview.rescheduled",
        entity_type: "interview",
        entity_id: interviewId,
        summary: row.candidate_name
            ? `Rescheduled interview with ${row.candidate_name} for ${row.job_name ?? "a role"} to ${format_interview_time(start_at, end_at)}`
            : "Rescheduled interview",
    });

    // Email the candidate the new time. Best-effort — the move already
    // happened, so a mail failure is reported, not thrown.
    let email_sent = false;
    if (row.candidate_email) {
        email_sent = await send_candidate_interview_email({
            orgId,
            templateId: "interview_rescheduled",
            candidateEmail: row.candidate_email,
            candidateName: row.candidate_name,
            candidateId: row.candidate_id,
            jobName: row.job_name,
            start_at,
            end_at,
            meetingLink: meet_link,
            location,
            extraText: reschedule_extra_text,
            sentBy: userId,
        });
    }

    // ── Outbound webhooks (feat/plugin-webhooks) ─────────────────────────
    // A reschedule is a new scheduled time, so it fires
    // interview_scheduled with the new times. Fire-and-forget.
    void fire_interview_webhooks(orgId, interviewId, "interview_scheduled");

    return { success: true as const, email_sent };
};

const cancelInterviewSchema = z.object({
    interviewId: z.number(),
    reason: z.string().max(255).optional(),
});

export const cancel_interview_action = async (
    unsafeData: z.infer<typeof cancelInterviewSchema>
) => {
    const { userId, orgId } = await auth();
    const parsed = cancelInterviewSchema.safeParse(unsafeData);

    if (!userId || !orgId || !parsed.success) {
        throw new Error(
            parsed.success ? "Unauthorized" : parsed.error.issues[0]?.message
        );
    }

    const allowed = await canCancelInterview();
    if (!allowed) throw new Error("Missing permission: interview:cancel");

    const { interviewId, reason } = parsed.data;

    await assertInterviewBelongsToOrg(interviewId, orgId);
    const row = await get_interview_by_id_db(interviewId, orgId);
    if (!row) throw new Error("Interview not found");

    if (is_dead_interview(row)) {
        throw new Error("This interview is already cancelled or its hold has ended.");
    }

    if (row.scheduling_provider === "zoom") {
        // Zoom interviews delete the Zoom meeting FIRST — a failed delete
        // surfaces the real Zoom error and the interview stays live (fail
        // closed, like the Calendly path). A 404 means the meeting is
        // already gone in Zoom, so the cancel proceeds and the row is
        // still recorded as cancelled.
        if (row.zoom_meeting_id) {
            const creds = await getZoomCredentialsForOrg(orgId);
            if (!creds) {
                throw new Error(
                    "Zoom is not connected — reconnect it to cancel this interview"
                );
            }
            try {
                await deleteZoomMeeting(creds.creds, row.zoom_meeting_id);
            } catch (err) {
                if (err instanceof ZoomApiError && err.isNotFound) {
                    console.error(
                        `[interview] Zoom meeting ${row.zoom_meeting_id} already gone for cancelled interview ${interviewId}; proceeding with the cancel`
                    );
                } else {
                    throw new Error(
                        err instanceof ZoomApiError
                            ? err.message
                            : `Could not delete the Zoom meeting: ${(err as Error).message}`
                    );
                }
            }
        }
    } else if (row.scheduling_provider === "calendly") {
        // Calendly interviews cancel in Calendly FIRST — a failed cancel
        // surfaces the real Calendly error and the interview stays live
        // (fail closed, like the Google hold-release path below). No
        // Google event exists for these rows, so the release block below
        // is skipped entirely.
        if (row.calendly_event_uri) {
            const creds = await getCalendlyPatForOrg(orgId);
            if (!creds) {
                throw new Error(
                    "Calendly is not connected — reconnect it to cancel this interview"
                );
            }
            try {
                await cancelCalendlyScheduledEvent(
                    creds.pat,
                    row.calendly_event_uri,
                    reason
                );
            } catch (err) {
                throw new Error(
                    err instanceof CalendlyApiError
                        ? err.message
                        : `Could not cancel the Calendly booking: ${(err as Error).message}`
                );
            }
        }
    } else if (row.calendar_event_id && row.calendar_owner_id) {
        // Release the calendar event first. Transient failure → fail closed so
        // the user can retry; permanent failure (owner disconnected Google) →
        // proceed and record the cancel anyway.
        const released = await releaseCalendarHold({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
        });
        if (!released.success && released.retryable) {
            throw new Error(
                "We couldn't release the calendar event. Please try again."
            );
        }
        if (!released.success) {
            console.error(
                `[interview] Could not release calendar event for cancelled interview ${interviewId}: ${released.error}`
            );
        }
    }

    await cancel_interview_db(interviewId, orgId, {
        hold_status:
            row.hold_status === "TENTATIVE" || row.hold_status === "CONFIRMED"
                ? "RELEASED"
                : "NONE",
        reason,
    });

    await record_activity({
        action: "interview.cancelled",
        entity_type: "interview",
        entity_id: interviewId,
        summary: row.candidate_name
            ? `Cancelled interview with ${row.candidate_name} for ${row.job_name ?? "a role"}${reason ? ` — ${reason}` : ""}`
            : "Cancelled interview",
    });

    let email_sent = false;
    if (row.candidate_email) {
        email_sent = await send_candidate_interview_email({
            orgId,
            templateId: "interview_cancelled",
            candidateEmail: row.candidate_email,
            candidateName: row.candidate_name,
            candidateId: row.candidate_id,
            jobName: row.job_name,
            start_at: row.start_at,
            end_at: row.end_at,
            cancelReason: reason,
            sentBy: userId,
        });
    }

    // ── Outbound webhooks (feat/plugin-webhooks) ─────────────────────────
    // interview_cancelled is webhook-only (no TriggerEvent, no plugin
    // dispatch) and never reaches the BullMQ worker, so the delivery
    // jobs are enqueued here. Fire-and-forget.
    void fire_interview_webhooks(orgId, interviewId, "interview_cancelled");

    return { success: true as const, email_sent };
};

/** Resolve an interview's interviewer_ids to org members for the card. */
export const get_interview_interviewers_action = async (
    interviewId: number
) => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    if (!(await hasPermission("interview:view"))) {
        throw new Error("Missing permission: interview:view");
    }

    await assertInterviewBelongsToOrg(interviewId, orgId);
    const row = await get_interview_by_id_db(interviewId, orgId);
    if (!row || !row.interviewer_ids?.length) return [];

    const members = await db_get_org_members_by_ids(orgId, row.interviewer_ids);
    return members.map((m) => ({ id: m.id, name: m.name, email: m.email }));
};
