// Screening-answer validation (pure — no server-only imports).
//
// Used by two call sites:
//   • src/server/actions/screening-actions.ts (re-exported for the UI agent)
//   • src/server/queries/drizzle/application.ts — inside create_application,
//     so a public apply submit is rejected with a form error when answers
//     are missing or invalid, before any row is written.
//
// The question shape below is the subset both call sites already load from
// the DB (drizzle row, camelCased by the caller).

import type { ScreeningQuestionType } from "@/zod";

export type ScreeningQuestionLike = {
    id: number;
    questionText: string;
    type: ScreeningQuestionType;
    options: string[] | null;
    isRequired: boolean;
    sortOrder: number;
};

export type ScreeningAnswerLike = {
    questionId: number;
    answer: string;
};

/** One validated + normalized answer, ready to insert into screening_answers. */
export type ValidatedScreeningAnswer = {
    questionId: number;
    /** Snapshot of the question text at answer time. */
    questionText: string;
    /** Snapshot of the question type at answer time. */
    questionType: ScreeningQuestionType;
    /** Snapshot of the question's sort_order at answer time (render order). */
    sortOrder: number;
    /** Normalized answer: trimmed; yes_no lowercased to "yes" | "no". */
    answer: string;
};

export type ValidateScreeningAnswersResult =
    | { success: true; answers: ValidatedScreeningAnswer[] }
    | { success: false; message: string };

const fail = (message: string): ValidateScreeningAnswersResult => ({
    success: false,
    message,
});

/**
 * Validate submitted answers against a job's questions.
 *
 * Rules:
 * - An answer for a question id that is not on the job is rejected.
 * - A duplicate answer for the same question is rejected.
 * - Every required question needs a non-empty answer (empty or
 *   whitespace-only counts as missing). An omitted/empty
 *   `screeningAnswers` with required questions on the job therefore
 *   fails validation.
 * - Optional questions with an empty/whitespace-only answer are skipped
 *   (no answer row is stored for them).
 * - Per type: yes_no must be exactly "yes" or "no" (case-insensitive,
 *   stored lowercased); single_choice must be exactly one of the
 *   question's options; number must parse as a finite number; text types
 *   must be non-empty strings.
 *
 * Returns the first failure only, as a single human-readable message the
 * apply form can show inline.
 */
export const validateScreeningAnswers = (
    questions: ScreeningQuestionLike[],
    answers: ScreeningAnswerLike[] | undefined,
): ValidateScreeningAnswersResult => {
    const submitted = answers ?? [];
    const byId = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<number>();
    const validated: ValidatedScreeningAnswer[] = [];

    for (const { questionId, answer } of submitted) {
        const question = byId.get(questionId);
        if (!question) {
            return fail("Answer provided for a question that does not belong to this job.");
        }
        if (seen.has(questionId)) {
            return fail(`Duplicate answer for question "${question.questionText}".`);
        }
        seen.add(questionId);

        const raw = typeof answer === "string" ? answer : "";
        const trimmed = raw.trim();

        // Empty answer: missing if required, skipped if optional.
        if (trimmed === "") {
            if (question.isRequired) {
                return fail(`"${question.questionText}" is required.`);
            }
            continue;
        }

        let normalized = trimmed;
        switch (question.type) {
            case "yes_no": {
                const lower = trimmed.toLowerCase();
                if (lower !== "yes" && lower !== "no") {
                    return fail(`"${question.questionText}" must be answered "yes" or "no".`);
                }
                normalized = lower;
                break;
            }
            case "single_choice": {
                const options = question.options ?? [];
                if (!options.includes(trimmed)) {
                    return fail(`"${question.questionText}" must be one of the available options.`);
                }
                break;
            }
            case "number": {
                const parsed = Number(trimmed);
                if (!Number.isFinite(parsed)) {
                    return fail(`"${question.questionText}" must be a number.`);
                }
                break;
            }
            case "short_text":
            case "long_text":
                // Non-empty after trim is enough (checked above).
                break;
        }

        validated.push({
            questionId: question.id,
            questionText: question.questionText,
            questionType: question.type,
            sortOrder: question.sortOrder,
            answer: normalized,
        });
    }

    // Required questions with no submitted answer at all.
    for (const question of questions) {
        if (question.isRequired && !seen.has(question.id)) {
            return fail(`"${question.questionText}" is required.`);
        }
    }

    return { success: true, answers: validated };
};
