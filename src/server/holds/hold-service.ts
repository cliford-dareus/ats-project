// Server/worker-only Smart Interview Hold service. Deliberately NOT "use server".

import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { interviews } from "@/drizzle/schema";
import { get_marketing_url } from "@/lib/marketing";
import { releaseCalendarHold } from "@/server/google-calenda";
import { render_org_template, send_org_email } from "@/server/email/org-mailer";
import { expire_stale_holds_db } from "@/server/queries/drizzle/interview";

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
    type?: string | null;
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
        type: "interview_hold",
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
 */
export async function expire_and_release_stale_holds() {
    const expired = await expire_stale_holds_db();
    let released = 0;

    for (const row of expired) {
        if (!row.calendar_event_id || !row.calendar_owner_id) continue;
        const res = await releaseCalendarHold({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
        });
        if (res.success) released++;
        else console.warn(`[holds] could not release calendar event for interview ${row.id}: ${res.error}`);
    }

    return { expired: expired.length, calendar_released: released };
}
