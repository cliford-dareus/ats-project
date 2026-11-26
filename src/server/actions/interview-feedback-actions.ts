'use server';

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { usersTable } from "@/drizzle/schema";
import { assertInterviewBelongsToOrg, requirePermission } from "@/server/permissions";
import { submit_interview_feedback_db } from "@/server/queries/drizzle/score-cards";

export const interviewFeedbackSchema = z.object({
    interviewId: z.number().int().positive(),
    decision: z
        .enum(["ADVANCE IMMEDIATELY", "REJECT IMMEDIATELY", "NO_DECISION"])
        .default("NO_DECISION"),
    overallRecommendation: z
        .enum(["DEFINITELY_NO", "NO", "YES", "STRONG_YES", "NO_DECISION"])
        .default("NO_DECISION"),
    feedback: z.string().max(5000).optional().default(""),
});

/**
 * Submit (or update) interview feedback. Gated on `candidate:evaluate`
 * (admin / recruiter / hiring_manager); the org always comes from the
 * Clerk session and the interview is re-resolved server-side — a caller
 * can only ever file feedback for their own org's interviews. Submitting
 * marks the interview COMPLETE.
 */
export const submit_interview_feedback_action = async (
    unsafeData: z.infer<typeof interviewFeedbackSchema>,
) => {
    const { userId, orgId } = await requirePermission("candidate:evaluate");

    const parsed = await interviewFeedbackSchema.spa(unsafeData);
    if (!parsed.success) {
        return { error: true as const, message: "Invalid feedback" };
    }

    await assertInterviewBelongsToOrg(parsed.data.interviewId, orgId);

    // Store the reviewer's display name, not the Clerk id.
    const [user] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

    const scoreCard = await submit_interview_feedback_db(
        {
            interviewId: parsed.data.interviewId,
            decision: parsed.data.decision,
            overallRecommendation: parsed.data.overallRecommendation,
            feedback: parsed.data.feedback ?? "",
            interviewer: user?.name ?? userId,
        },
        orgId,
    );

    return { success: true as const, scoreCard };
};
