"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { check_calendar_conflicts } from "@/server/calendar-availability";
import { canScheduleInterview } from "@/server/permissions";

const availabilityInputSchema = z.object({
    start_at: z.coerce.date(),
    end_at: z.coerce.date(),
});

export type InterviewAvailabilityConflict = {
    start: string;
    end: string;
    summary?: string;
};

export type InterviewAvailabilityResult = {
    connected: boolean;
    conflicts: InterviewAvailabilityConflict[];
    error?: string;
};

/**
 * Check the scheduler's own Google Calendar for events overlapping
 * [start_at, end_at). Used by the schedule-interview modal as a status
 * line and a pre-flight check before placing a hold / scheduling directly.
 *
 * Takes only times — no org or client ids. The userId comes from the Clerk
 * session, and the caller must hold "interview:schedule".
 *
 * `connected: false` means no usable Google token (or the check itself
 * failed — see `error`); the caller must say so instead of claiming the
 * slot is free. A failed check never throws: the modal shows the error
 * and lets scheduling proceed, since the schedule actions themselves fail
 * honestly when the calendar is actually needed.
 */
export const check_interview_availability_action = async (
    unsafeInput: z.infer<typeof availabilityInputSchema>
): Promise<InterviewAvailabilityResult> => {
    const { userId } = await auth();
    const parsed = availabilityInputSchema.safeParse(unsafeInput);

    if (!userId || !parsed.success) {
        return {
            connected: false,
            conflicts: [],
            error: "Invalid time range",
        };
    }

    const allowed = await canScheduleInterview();
    if (!allowed) {
        return {
            connected: false,
            conflicts: [],
            error: "Missing permission: interview:schedule",
        };
    }

    const { start_at, end_at } = parsed.data;
    if (end_at <= start_at) {
        return {
            connected: false,
            conflicts: [],
            error: "End time must be after start time",
        };
    }

    const result = await check_calendar_conflicts(userId, start_at, end_at);

    return {
        connected: result.connected,
        conflicts: result.conflicts.map((conflict) => ({
            start: conflict.start.toISOString(),
            end: conflict.end.toISOString(),
            summary: conflict.summary,
        })),
        error: result.error,
    };
};
