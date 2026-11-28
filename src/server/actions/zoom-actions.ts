"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/zoom-actions.ts — Zoom video-interview scheduling.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk session
// (getAuthOrThrow) — no client-supplied orgId is ever trusted. The
// Server-to-Server credentials never leave the server: the modal calls
// these actions, never Zoom directly.
//
// Permissions: scheduling / status reads need `interview:schedule` OR
// `plugin:manage` (the settings page user may not hold
// interview:schedule). Booking failures surface Zoom's real error and
// create NOTHING — no fake interview row, no join link invented.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import {
    ZoomApiError,
    createZoomMeeting,
    deleteZoomMeeting,
    getZoomCredentialsForOrg,
    getZoomCurrentUser,
} from "@/server/zoom";
import {
    create_interview_db,
    get_interview_by_application_db,
    get_interview_details_for_application_db,
} from "@/server/queries/drizzle/interview";
import { getAuthOrThrow, hasPermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import { send_candidate_interview_email } from "@/server/actions/interview-actions";

/** Scheduling reads are allowed for schedulers AND plugin managers. */
async function can_use_zoom_scheduling(): Promise<boolean> {
    return (
        (await hasPermission("interview:schedule")) ||
        (await hasPermission("plugin:manage"))
    );
}

// ── Status ───────────────────────────────────────────────────────────────────

/**
 * Whether Zoom is connected for this org + who hosts the meetings, for
 * the schedule modal. `connected: false` means no usable credentials
 * are stored — never an error to retry. Zoom is offered ONLY for VIDEO
 * interviews; the modal enforces that, and the booking action below
 * refuses anything else server-side.
 */
export async function get_zoom_status_action(): Promise<{
    success: boolean;
    connected: boolean;
    userName: string | null;
    userEmail: string | null;
    message: string;
}> {
    const { orgId } = await getAuthOrThrow();
    if (!(await can_use_zoom_scheduling())) {
        return {
            success: false,
            connected: false,
            userName: null,
            userEmail: null,
            message: "Missing permission: interview:schedule",
        };
    }

    const stored = await getZoomCredentialsForOrg(orgId);
    if (!stored) {
        return {
            success: false,
            connected: false,
            userName: null,
            userEmail: null,
            message: "Zoom is not connected for this organization",
        };
    }

    // The stored host name/email may predate a re-connect; fall back to
    // a live /users/me when missing so the modal still names the host.
    let userName = stored.userName;
    let userEmail = stored.userEmail;
    if (!userName && !userEmail) {
        try {
            const me = await getZoomCurrentUser(stored.creds);
            userName =
                [me.first_name, me.last_name].filter(Boolean).join(" ") || null;
            userEmail = me.email ?? null;
        } catch (err) {
            return {
                success: false,
                connected: false,
                userName: null,
                userEmail: null,
                message: (err as Error).message || "Failed to verify Zoom credentials",
            };
        }
    }

    return {
        success: true,
        connected: true,
        userName,
        userEmail,
        message: "Zoom connected",
    };
}

// ── Booking ──────────────────────────────────────────────────────────────────

const createZoomInterviewSchema = z.object({
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
});

/**
 * Create a Zoom meeting + interview row (server-side only — the
 * credentials never leave the server). Flow: VIDEO-only guard →
 * duplicate guard → POST /users/me/meetings → create the interview row
 * (scheduling_provider='zoom', link=join_url, zoom_meeting_id) → invite
 * email with the real join link.
 *
 * On ANY failure before the row is created, nothing is created. If the
 * DB insert fails AFTER the Zoom meeting exists, the meeting is deleted
 * best-effort so no orphaned Zoom meeting survives. A meeting created
 * without a join_url in the response is deleted best-effort and the
 * booking fails — a join link is the whole point, so a link-less row
 * is never stored as if it worked.
 */
export const create_zoom_interview_action = async (
    unsafeData: z.infer<typeof createZoomInterviewSchema>
) => {
    const { userId, orgId } = await auth();
    const parsed = createZoomInterviewSchema.safeParse(unsafeData);
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
    if (data.type !== "VIDEO") {
        throw new Error("Zoom meetings are only available for video interviews.");
    }

    const existing = await get_interview_by_application_db(data.applicationId);
    if (existing) {
        throw new Error("Application already has an interview");
    }

    const stored = await getZoomCredentialsForOrg(orgId);
    if (!stored) {
        throw new Error("Zoom is not connected for this organization");
    }

    const durationMinutes = Math.round(
        (data.end_at.getTime() - data.start_at.getTime()) / 60000
    );
    const meeting = await createZoomMeeting(stored.creds, {
        topic: `Interview: ${data.candidate_name} — ${data.job_name}`,
        startTime: data.start_at.toISOString(),
        durationMinutes,
        agenda: `Interview with ${data.candidate_name} for the ${data.job_name} position.`,
    });

    if (!meeting.join_url) {
        // A meeting without a join URL is useless — delete it
        // best-effort and fail honestly instead of storing a link-less row.
        try {
            await deleteZoomMeeting(stored.creds, String(meeting.id));
        } catch {
            console.error(
                `[zoom] Orphaned Zoom meeting ${meeting.id} after a join-URL-less create`
            );
        }
        throw new Error("Zoom created a meeting but returned no join link");
    }

    let interviewId: number | null;
    try {
        interviewId = await create_interview_db(
            {
                applicationId: data.applicationId,
                job_id: data.job_id,
                start_at: data.start_at,
                end_at: data.end_at,
                link: meeting.join_url,
                location: data.location,
                type: data.type,
                status: "SCHEDULE",
                interviewer_ids: data.interviewer_ids ?? [],
                scheduling_provider: "zoom",
                zoom_meeting_id: String(meeting.id),
            },
            orgId
        );
    } catch (err) {
        // The Zoom meeting exists but Applico has no row for it — delete
        // it best-effort so the slot isn't held by a ghost meeting.
        try {
            await deleteZoomMeeting(stored.creds, String(meeting.id));
        } catch {
            console.error(
                `[zoom] Orphaned Zoom meeting ${meeting.id} after a failed interview save`
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
                ? `Scheduled interview with ${details.candidate_name} for ${details.job_name ?? "a role"} via Zoom`
                : "Scheduled interview via Zoom",
        });
    }

    // Invite email (best-effort — the meeting already exists, so a mail
    // failure is logged, never thrown). The join link is the real one
    // Zoom returned; the meeting password rides along when Zoom set one.
    let email_sent = false;
    try {
        const details = await get_interview_details_for_application_db(
            data.applicationId,
            orgId
        );
        if (details?.candidate_email) {
            const extraLines = meeting.password
                ? `Join link: ${meeting.join_url}\nMeeting password: ${meeting.password}`
                : `Join link: ${meeting.join_url}`;
            email_sent = await send_candidate_interview_email({
                orgId,
                templateId: "interview_invite",
                candidateEmail: details.candidate_email,
                candidateName: details.candidate_name,
                candidateId: details.candidate_id,
                jobName: details.job_name,
                start_at: data.start_at,
                end_at: data.end_at,
                meetingLink: meeting.join_url,
                location: data.location,
                extraText: extraLines,
                sentBy: userId,
            });
        }
    } catch (error) {
        console.error("[zoom] Failed to send Zoom invite email:", error);
    }

    return {
        success: true as const,
        interviewId,
        meetingId: String(meeting.id),
        joinUrl: meeting.join_url,
        email_sent,
    };
};

// Re-export the error type for callers that surface Zoom's real error.
export { ZoomApiError };
