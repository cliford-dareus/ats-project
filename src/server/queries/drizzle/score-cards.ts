import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { applications, interviews, score_cards } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

// ── Interview feedback / scorecards (D3) ──────────────────────────────────────
// score_cards carries no org column — every read/write scopes through its
// interview (interviews.organization), never through a client-supplied org.

export type ScoreCardRow = {
    id: number;
    interviews_id: number | null;
    interviewer: string;
    decision: "ADVANCE IMMEDIATELY" | "REJECT IMMEDIATELY" | "NO_DECISION" | null;
    overall_recommendations: "DEFINITELY_NO" | "NO" | "YES" | "STRONG_YES" | "NO_DECISION" | null;
    feedback: string | null;
    created_at: Date;
    updated_at: Date;
    interview_start_at: Date | null;
    interview_type: "VIDEO" | "PHONE" | "ONSITE" | null;
};

const scoreCardSelect = {
    id: score_cards.id,
    interviews_id: score_cards.interviews_id,
    interviewer: score_cards.interviewer,
    decision: score_cards.decision,
    overall_recommendations: score_cards.overall_recommendations,
    feedback: score_cards.feedback,
    created_at: score_cards.created_at,
    updated_at: score_cards.updated_at,
    interview_start_at: interviews.start_at,
    interview_type: interviews.type,
};

/** All scorecards for one candidate's applications (newest first). */
export const get_score_cards_for_candidate_db = async (
    candidateId: number,
    orgId: string,
): Promise<ScoreCardRow[]> => {
    return db
        .select(scoreCardSelect)
        .from(score_cards)
        .innerJoin(interviews, eq(interviews.id, score_cards.interviews_id))
        .innerJoin(applications, eq(applications.id, interviews.applications_id))
        .where(
            and(
                eq(applications.candidate, candidateId),
                eq(applications.organization, orgId),
                isNull(applications.deleted_at),
            ),
        )
        .orderBy(desc(score_cards.created_at));
};

/** The scorecard for one interview, or null. Org-scoped via the interview. */
export const get_score_card_by_interview_db = async (
    interviewId: number,
    orgId: string,
): Promise<ScoreCardRow | null> => {
    const [row] = await db
        .select(scoreCardSelect)
        .from(score_cards)
        .innerJoin(interviews, eq(interviews.id, score_cards.interviews_id))
        .leftJoin(applications, eq(applications.id, interviews.applications_id))
        .where(
            and(
                eq(score_cards.interviews_id, interviewId),
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
            ),
        )
        .limit(1);

    return row ?? null;
};

export type SubmitFeedbackInput = {
    interviewId: number;
    decision: "ADVANCE IMMEDIATELY" | "REJECT IMMEDIATELY" | "NO_DECISION";
    overallRecommendation: "DEFINITELY_NO" | "NO" | "YES" | "STRONG_YES" | "NO_DECISION";
    feedback: string;
    /** Display name of the reviewer (resolved server-side from users_table). */
    interviewer: string;
};

/**
 * Record (or update — one scorecard per interview) feedback for an interview
 * and mark the interview COMPLETE. The interview must belong to the org;
 * anything else throws before any write.
 */
export const submit_interview_feedback_db = async (
    input: SubmitFeedbackInput,
    orgId: string,
): Promise<ScoreCardRow | null> => {
    const [interview] = await db
        .select({ id: interviews.id, applications_id: interviews.applications_id })
        .from(interviews)
        .leftJoin(applications, eq(applications.id, interviews.applications_id))
        .where(
            and(
                eq(interviews.id, input.interviewId),
                eq(interviews.organization, orgId),
                isNull(applications.deleted_at),
            ),
        )
        .limit(1);

    if (!interview) throw new Error("Interview not found");

    // One scorecard per interview (unique index on interviews_id) — a
    // re-submission updates the existing card instead of duplicating it.
    await db
        .insert(score_cards)
        .values({
            interviews_id: input.interviewId,
            interviewer: input.interviewer,
            decision: input.decision,
            overall_recommendations: input.overallRecommendation,
            feedback: input.feedback || null,
        })
        .onDuplicateKeyUpdate({
            set: {
                interviewer: input.interviewer,
                decision: input.decision,
                overall_recommendations: input.overallRecommendation,
                feedback: input.feedback || null,
            },
        });

    // Submitted feedback completes the interview.
    await db
        .update(interviews)
        .set({ status: "COMPLETE" })
        .where(
            and(
                eq(interviews.id, input.interviewId),
                eq(interviews.organization, orgId),
            ),
        );

    if (interview.applications_id) {
        revalidateDbCache({
            tag: CACHE_TAGS.applications,
            id: String(interview.applications_id),
            orgId,
        });
    }

    return get_score_card_by_interview_db(input.interviewId, orgId);
};
