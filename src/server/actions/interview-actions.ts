"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { newInterviewSchema } from "@/zod";
import {
    create_interview_db,
    create_interview_hold_db,
    get_interview_by_hold_token,
    mark_hold_confirmed_db,
    mark_hold_released_db,
} from "../queries/drizzle/interview";
import {
    confirmCalendarHold,
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

    const hold = await create_interview_hold_db(
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

    const confirm_url = `${hold_public_base_url()}/interview/hold/${hold.hold_token}`;

    return {
        success: true as const,
        hold_token: hold.hold_token,
        hold_expires_at: hold.hold_expires_at,
        confirm_url,
        calendar_event_id: calendar.eventId,
    };
};

export const confirm_interview_hold_action = async (token: string) => {
    if (!token || token.length < 16) {
        return { success: false as const, error: "Invalid link" };
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) {
        return { success: false as const, error: "Hold not found" };
    }

    if (row.hold_status === "CONFIRMED") {
        return {
            success: true as const,
            already: true as const,
            message: "Already confirmed",
        };
    }

    if (row.hold_status !== "TENTATIVE") {
        return {
            success: false as const,
            error: `This hold is ${row.hold_status?.toLowerCase() ?? "unavailable"}`,
        };
    }

    if (row.hold_expires_at && new Date(row.hold_expires_at) < new Date()) {
        await mark_hold_released_db(row.interview_id, row.organization, "EXPIRED");
        if (row.calendar_event_id && row.calendar_owner_id) {
            await releaseCalendarHold({
                clerkUserId: row.calendar_owner_id,
                eventId: row.calendar_event_id,
            });
        }
        return { success: false as const, error: "This hold has expired" };
    }

    if (row.calendar_event_id && row.calendar_owner_id && row.candidate_email) {
        await confirmCalendarHold({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
            payload: {
                summary: `Interview: ${row.candidate_name} — ${row.job_name}`,
                description: "Candidate confirmed this interview slot.",
                candidateEmail: row.candidate_email,
                meetLink: row.link ?? undefined,
            },
        });
    }

    await mark_hold_confirmed_db(row.interview_id, row.organization);

    return {
        success: true as const,
        start_at: row.start_at,
        end_at: row.end_at,
        type: row.type,
        job_name: row.job_name,
        link: row.link,
    };
};

export const decline_interview_hold_action = async (token: string) => {
    if (!token || token.length < 16) {
        return { success: false as const, error: "Invalid link" };
    }

    const row = await get_interview_by_hold_token(token);
    if (!row) {
        return { success: false as const, error: "Hold not found" };
    }

    if (row.hold_status !== "TENTATIVE") {
        return {
            success: false as const,
            error: "This hold can no longer be declined",
        };
    }

    if (row.calendar_event_id && row.calendar_owner_id) {
        await releaseCalendarHold({
            clerkUserId: row.calendar_owner_id,
            eventId: row.calendar_event_id,
        });
    }

    await mark_hold_released_db(row.interview_id, row.organization, "DECLINED");

    return { success: true as const };
};

export const get_hold_public_details_action = async (token: string) => {
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
