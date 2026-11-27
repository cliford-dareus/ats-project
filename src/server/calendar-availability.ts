// Server/worker-only calendar availability check. Deliberately NOT "use server".
//
// Wraps getCalendarEventTimes (src/server/google-calenda.ts): returns the
// scheduler's own calendar events overlapping [start, end).
// `connected: false` means the scheduler has no usable Google token — the
// caller must say so in the UI instead of silently scheduling blind.
// `excludeEventId` skips the interview's own event (reschedule re-check).

import { getCalendarEventTimes, getOAuthClient } from "@/server/google-calenda";

export type CalendarConflict = {
    start: Date;
    end: Date;
    summary?: string;
};

export async function check_calendar_conflicts(
    clerkUserId: string,
    start: Date,
    end: Date,
    excludeEventId?: string
): Promise<{
    connected: boolean;
    conflicts: CalendarConflict[];
    error?: string;
}> {
    try {
        const client = await getOAuthClient(clerkUserId);
        if (!client) {
            return { connected: false, conflicts: [] };
        }
        const events = await getCalendarEventTimes(clerkUserId, { start, end });
        const conflicts = events
            .filter((event) => {
                if (excludeEventId && event.id === excludeEventId) return false;
                // Overlap test; an event that only touches the boundary is free.
                return event.start < end && event.end > start;
            })
            .map((event) => ({
                start: event.start,
                end: event.end,
                summary: event.summary,
            }));
        return { connected: true, conflicts };
    } catch (error) {
        return {
            connected: false,
            conflicts: [],
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
