"use server";

import React from "react";
import { z } from "zod";
import { render } from "@react-email/components";
import { auth } from "@clerk/nextjs/server";
import { newInterviewSchema } from "@/zod";
import InterviewHoldTemplate from "@/emails/interview_hold_template";
import { sendEmail } from "@/lib/resend";
import { check_rate_limit, get_client_ip } from "@/lib/rate-limit";
import {
    create_interview_db,
    create_interview_hold_db,
    get_interview_by_application_db,
    get_interview_by_hold_token,
    mark_hold_confirmed_db,
    mark_hold_released_db,
} from "../queries/drizzle/interview";
import { db_get_org_plugin_state } from "../queries/drizzle/plugin-queries";
import {
    confirmCalendarHold,
    createCalendarEvent,
    createTentativeHoldEvent,
    releaseCalendarHold,
} from "../google-calenda";
import { canScheduleInterview } from "../permissions";

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
        check_rate_limit(`hold:ip:${ip}`, 60, HOLD_RATE_LIMIT_WINDOW_MS) &&
        check_rate_limit(`hold:token:${token}`, 10, HOLD_RATE_LIMIT_WINDOW_MS)
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

    return await create_interview_db(data, orgId);
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

    return { success: true as const };
};

export const get_hold_public_details_action = async (token: string) => {
    if (!is_valid_hold_token(token)) return null;

    // Page loads are the enumeration vector (a valid token renders, an
    // invalid one 404s), so rate-limit them per IP; a limited load looks
    // exactly like an invalid token.
    const ip = await get_client_ip();
    if (!check_rate_limit(`hold:page:${ip}`, 60, HOLD_RATE_LIMIT_WINDOW_MS)) {
        return null;
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) return null;

    return {
        candidate_name: row.candidate_name,
        job_name: row.job_name,
        start_at: row.start_at,
        end_at: row.end_at,
        type: row.type,
        locations: row.locations,
        hold_status: row.hold_status,
        hold_expires_at: row.hold_expires_at,
        expired:
            !!row.hold_expires_at && new Date(row.hold_expires_at) < new Date(),
    };
};
