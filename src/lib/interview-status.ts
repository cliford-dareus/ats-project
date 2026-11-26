/**
 * Derived interview status — no cron/worker involved.
 *
 * An interview whose scheduled time has passed with no submitted feedback
 * reads as AWAITING_FEEDBACK; the stored status stays SCHEDULE until
 * feedback is actually submitted, at which point it becomes COMPLETE
 * (see submit_interview_feedback_db).
 */
export type InterviewStatusInput = {
    status: string | null;
    end_at: Date | string | null;
    hold_status?: string | null;
};

export const is_interview_awaiting_feedback = (
    interview: InterviewStatusInput,
): boolean => {
    if (interview.status !== "SCHEDULE" || !interview.end_at) return false;
    return new Date(interview.end_at).getTime() < Date.now();
};

export const derive_interview_status = (interview: InterviewStatusInput): string => {
    if (is_interview_awaiting_feedback(interview)) return "AWAITING_FEEDBACK";
    return interview.status ?? "SCHEDULE";
};

/** Feedback is only meaningful once the interview is on the calendar. */
export const can_submit_interview_feedback = (
    interview: InterviewStatusInput,
): boolean => {
    // A dead hold never became an interview — nothing to evaluate.
    if (
        interview.hold_status &&
        ["DECLINED", "EXPIRED", "RELEASED"].includes(interview.hold_status)
    ) {
        return false;
    }
    const status = derive_interview_status(interview);
    return status === "SCHEDULE" || status === "AWAITING_FEEDBACK" || status === "COMPLETE";
};
