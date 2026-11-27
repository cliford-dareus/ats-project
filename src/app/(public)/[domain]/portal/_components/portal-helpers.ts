import type { PortalApplication } from "@/server/portal/portal-service";

/**
 * Portal display helpers — plain-language mapping over the backend
 * contract types only. Nothing here invents data: every label and timeline
 * step is derived from the stage name, candidate status, interview rows
 * and applied date the portal service returns.
 *
 * Source values (from src/drizzle/schema.ts):
 * - stages.stage_name enum: 'Applied' | 'New Candidate' | 'Screening' |
 *   'Phone Interview' | 'Interview' | 'Offer' | 'Drafted', ordered per job
 *   by stage_order_id. The portal contract carries only the stage NAME
 *   (no order), so "beyond applied" is decided by name below.
 * - candidates.status enum: 'ACTIVE' | 'REJECTED' | 'HIRED'. The
 *   applications table has no status column of its own, so the contract's
 *   `status` is the candidate status for this application.
 * - interviews.status enum: 'SCHEDULE' | 'AWAITING_FEEDBACK' |
 *   'COMPLETE' | 'HOLD_PENDING' | 'CANCELLED'; type enum:
 *   'VIDEO' | 'PHONE' | 'ONSITE'.
 */

/** Human label for an application's current state. Unknown stage names are
 * shown as-is rather than mapped to a label the data does not support. */
export function portal_status_label(app: PortalApplication): string {
    if (app.status === "REJECTED") return "Not selected";
    if (app.status === "HIRED") return "Hired";
    switch (app.stageName) {
        case "Applied":
        case "New Candidate":
            return "Applied";
        case "Screening":
            return "Under review";
        case "Phone Interview":
        case "Interview":
            return "Interview";
        case "Offer":
            return "Offer";
        case null:
            // No stage recorded: the application exists, so it was applied.
            return "Applied";
        default:
            // e.g. "Drafted" or a future stage name — show it verbatim.
            return app.stageName;
    }
}

export type PortalTimelineStep = {
    id: "applied" | "review" | "interview" | "decision";
    label: string;
    reached: boolean;
};

/**
 * Timeline derivation — a step is reached ONLY when the data supports it:
 * - Applied: reached — the application exists.
 * - Under review: the stage is past the initial applied stage (Screening,
 *   Phone Interview, Interview, Offer), or the application already has a
 *   decision outcome (a rejection/hire implies it was reviewed).
 * - Interview: the application has any interview row, or its stage is an
 *   interview stage (Phone Interview / Interview).
 * - Decision: the stage is Offer, or the candidate status is HIRED /
 *   REJECTED. Nothing else counts as a decision.
 */
export function portal_timeline(app: PortalApplication): PortalTimelineStep[] {
    const stage = app.stageName;
    const isInterviewStage = stage === "Phone Interview" || stage === "Interview";
    const beyondApplied =
        stage === "Screening" || isInterviewStage || stage === "Offer";
    const decided =
        stage === "Offer" || app.status === "HIRED" || app.status === "REJECTED";

    return [
        { id: "applied", label: "Applied", reached: true },
        { id: "review", label: "Under review", reached: beyondApplied || decided },
        {
            id: "interview",
            label: "Interview",
            reached: app.interviews.length > 0 || isInterviewStage,
        },
        { id: "decision", label: "Decision", reached: decided },
    ];
}

/** Short date in UTC, e.g. "Nov 27, 2026". */
export function format_portal_date(value: Date | string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

/** Date + time in UTC, e.g. "Fri, Nov 27, 2026 at 2:00 PM UTC". */
export function format_portal_datetime(value: Date | string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const day = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
    const time = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
    }).format(date);
    return `${day} at ${time} UTC`;
}

export function interview_type_label(type: string | null): string {
    switch (type) {
        case "VIDEO":
            return "Video";
        case "PHONE":
            return "Phone";
        case "ONSITE":
            return "On-site";
        default:
            return "Interview";
    }
}

export function interview_status_label(status: string | null): string | null {
    switch (status) {
        case "SCHEDULE":
            return "Scheduled";
        case "AWAITING_FEEDBACK":
            return "Awaiting feedback";
        case "COMPLETE":
            return "Completed";
        case "HOLD_PENDING":
            return "On hold";
        case "CANCELLED":
            return "Cancelled";
        default:
            return null;
    }
}
