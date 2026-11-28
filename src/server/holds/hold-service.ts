// Server/worker-only Smart Interview Hold service. Deliberately NOT "use server".

import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { interviews } from "@/drizzle/schema";
import { get_marketing_url } from "@/lib/marketing";
import { releaseCalendarHold } from "@/server/google-calenda";
import {
    get_org_profile,
    render_org_template,
    send_org_email,
} from "@/server/email/org-mailer";
import { create_notifications_db } from "@/server/queries/mongo/notifications";
import { expire_stale_holds_db } from "@/server/queries/drizzle/interview";
import type { CommunicationType } from "@/models/communication-log";

export function hold_confirm_url(token: string) {
    return `${get_marketing_url()}/interview/hold/${token}`;
}

/** Times are stored in UTC; emails state the zone explicitly. */
export function format_interview_time(start: Date | null, end?: Date | null) {
    if (!start) return "Time to be confirmed";
    const date = start.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    });
    const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    return end ? `${date}, ${fmt(start)} – ${fmt(end)} UTC` : `${date}, ${fmt(start)} UTC`;
}

type HoldEmailInput = {
    orgId: string;
    interviewId: number;
    token: string;
    candidate: { id?: number | null; name?: string | null; email?: string | null };
    jobName?: string | null;
    companyName?: string | null;
    start_at: Date | null;
    end_at: Date | null;
    type?: CommunicationType | null;
    hold_expires_at: Date | null;
    sender?: { userId: string; name: string };
};

export async function send_hold_email(input: HoldEmailInput) {
    if (!input.candidate.email) return { success: false, error: "Candidate has no email" };

    const rendered = await render_org_template(input.orgId, "interview_hold", {
        candidateName: input.candidate.name?.split(" ")[0] ?? "there",
        jobTitle: input.jobName ?? "the role",
        companyName: input.companyName ?? "our team",
        interviewDate: format_interview_time(input.start_at, input.end_at),
        interviewType: (input.type ?? "").toLowerCase() || "interview",
        confirmUrl: hold_confirm_url(input.token),
        holdExpiresAt: input.hold_expires_at ? format_interview_time(input.hold_expires_at) : "soon",
        senderName: input.sender?.name ?? "",
    });

    const result = await send_org_email({
        orgId: input.orgId,
        to: input.candidate.email,
        toName: input.candidate.name ?? undefined,
        subject: rendered.subject,
        text: rendered.text,
        type: input.type ?? "interview_hold",
        templateId: rendered.templateId,
        candidateId: input.candidate.id ?? undefined,
        sentBy: input.sender?.userId,
        authorName: input.sender?.name,
    });

    if (result.success) {
        await db
            .update(interviews)
            .set({ hold_email_sent_at: new Date() })
            .where(eq(interviews.id, input.interviewId));
    }
    return result;
}

/**
 * Expires stale TENTATIVE holds and frees their calendar slots.
 * Safe to run concurrently: only rows this call transitioned are released.
 * Each transitioned hold's owner is notified exactly once (the expiry
 * query only returns rows this call moved out of TENTATIVE).
 *
 * Calendly interviews never reach this function: get_stale_holds_db
 * only returns TENTATIVE holds AND explicitly excludes
 * scheduling_provider='calendly' — Calendly bookings have no tentative
 * Google event to release, and their hold_status is never TENTATIVE.
 * The worker sweep reads the same guarded query.
 */
export async function expire_and_release_stale_holds() {
    const expired = await expire_stale_holds_db();
    let released = 0;
    let notified = 0;

    for (const row of expired) {
        if (row.calendar_event_id && row.calendar_owner_id) {
            const res = await releaseCalendarHold({
                clerkUserId: row.calendar_owner_id,
                eventId: row.calendar_event_id,
            });
            if (res.success) released++;
            else console.warn(`[holds] could not release calendar event for interview ${row.id}: ${res.error}`);
        }

        if (row.calendar_owner_id) {
            await notify_hold_expired({
                orgId: row.organization,
                ownerId: row.calendar_owner_id,
                applicationId: row.applications_id,
                candidateName: row.candidate_name,
                jobName: row.job_name,
                start_at: row.start_at,
                end_at: row.end_at,
            });
            notified++;
        }
    }

    return { expired: expired.length, calendar_released: released, notified };
}

/** Details a hold-expiry notice needs. Shared by the worker sweep and the cron route. */
export type ExpiredHoldDetails = {
    orgId: string;
    ownerId: string;
    applicationId?: number | null;
    candidateName?: string | null;
    jobName?: string | null;
    start_at: Date | null;
    end_at: Date | null;
};

/**
 * Notify the recruiter who placed a hold that it expired unanswered:
 * in-app notification + email. Best-effort: never throws, so a notify
 * failure can't break the expiry sweep that called it.
 * Call ONLY after the row was actually transitioned out of TENTATIVE —
 * the guarded mark_hold_expired_db return value is what guarantees a
 * hold is notified exactly once.
 */
export async function notify_hold_expired(
    details: ExpiredHoldDetails
): Promise<void> {
    const when = format_interview_time(details.start_at, details.end_at);
    const who = details.candidateName ?? "The candidate";
    const what = details.jobName ?? "the role";

    try {
        await create_notifications_db(details.orgId, [details.ownerId], {
            kind: "interview_expired",
            title: `Interview hold expired: ${who} — ${what}`,
            body: `The interview hold for ${who} (${what}, ${when}) expired without a response. The calendar hold has been released.`,
            link: details.applicationId
                ? `/applications/${details.applicationId}`
                : undefined,
        });
    } catch (error) {
        console.error(
            "[holds] Failed to notify hold owner of expiry (in-app):",
            error
        );
    }

    try {
        const clerk = await clerkClient();
        const owner = await clerk.users.getUser(details.ownerId);
        const email = owner.primaryEmailAddress?.emailAddress;
        if (!email) return;
        const org = await get_org_profile(details.orgId);
        const rendered = await render_org_template(
            details.orgId,
            "interview_hold_expired",
            {
                candidateName: who,
                jobTitle: what,
                interviewDate: when,
                companyName: org?.name ?? "Applico",
            }
        );
        await send_org_email({
            orgId: details.orgId,
            to: email,
            toName: owner.firstName ?? undefined,
            subject: rendered.subject,
            text: rendered.text,
            type: "interview_expired",
            templateId: rendered.templateId,
        });
    } catch (error) {
        console.error(
            "[holds] Failed to notify hold owner of expiry (email):",
            error
        );
    }
}
