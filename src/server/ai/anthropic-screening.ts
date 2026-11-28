// Server/worker-only Anthropic helpers for the anthropic-screening plugin.
// Deliberately NOT "use server": these spend LLM quota with the org's
// encrypted API key, so they must only be reached through guarded actions
// (src/server/actions/anthropic-actions.ts). Raw fetch, no @anthropic-ai/sdk
// dependency — mirrors verifyGoogle's lightweight fetch in plugin-actions.
//
// Messages API: POST https://api.anthropic.com/v1/messages with
// `x-api-key` + `anthropic-version: 2023-06-01`. Verify uses the real List
// Models endpoint (GET /v1/models) — 200 for a valid key, 401 for a bad one.

import { z } from "zod";

// Pinned model id actually called — shown on the interview prep card, so
// a model change is visible instead of silently drifting behind an alias.
export const ANTHROPIC_SCREENING_MODEL = "claude-sonnet-4-5-20250929";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Input caps keep one generation bounded: the job description and resume
// material are truncated, never silently dropped, and the caps are named
// here so a too-long input degrades to "shorter source" rather than a
// failed call.
const MAX_JOB_DESCRIPTION_CHARS = 6000;
const MAX_RESUME_SUMMARY_CHARS = 3000;
const MAX_EXPERIENCE_CHARS = 4000;

// ── Output shape (validated with zod — a malformed Claude reply is a
// failed generation, never rendered as questions) ──────────────────────────
export const interviewQuestionSchema = z.object({
    category: z.string().min(1),
    question: z.string().min(1),
    rationale: z.string().min(1),
});

export const interviewInsightsSchema = z.object({
    summary: z.string().min(1),
    strengths: z.array(z.string()),
    risks: z.array(z.string()),
    focusAreas: z.array(z.string()),
});

export const interviewPrepOutputSchema = z.object({
    questions: z.array(interviewQuestionSchema).min(1).max(20),
    insights: interviewInsightsSchema,
});

export type InterviewPrepOutput = z.infer<typeof interviewPrepOutputSchema>;

// ── Stage awareness ─────────────────────────────────────────────────────────
// The prompt names the application's CURRENT stage (JOB_STAGES) and the
// focus that stage implies, so the questions fit where the candidate is in
// the pipeline instead of being generic. The stage is also snapshotted on
// the stored row — the card warns when the candidate has since moved stage.
const STAGE_FOCUS: Record<string, string> = {
    "New Candidate": "Early screen: motivation for the role, role understanding, communication, and availability.",
    "Applied": "Early screen: motivation for the role, role understanding, communication, and availability.",
    "Screening": "Screening: motivation, core-skill sanity checks, work history walkthrough, and logistics.",
    "Phone Interview": "Phone screen: concise verbal reasoning, experience walkthrough, and communication under time pressure.",
    "Interview": "In-depth interview: technical depth, evidence from past work, problem-solving, and trade-off judgement.",
    "Offer": "Closing stage: expectations, start-date readiness, remaining concerns, and what would make the candidate accept.",
    "Drafted": "Early screen: motivation for the role, role understanding, communication, and availability.",
};

export const stage_focus_for = (stageName: string | null | undefined): string =>
    STAGE_FOCUS[stageName ?? ""] ??
    "Interview preparation: motivation, skills, experience, and role fit.";

const truncate = (value: string | undefined | null, max: number): string => {
    const text = (value ?? "").trim();
    return text.length > max ? text.slice(0, max) : text;
};

type AnthropicErrorBody = { error?: { type?: string; message?: string } };

const anthropic_error_message = async (res: Response): Promise<string> => {
    let detail = "";
    try {
        const body = (await res.json()) as AnthropicErrorBody;
        detail = body?.error?.message ?? "";
    } catch {
        // Non-JSON error body — fall through to the status message.
    }
    if (res.status === 401) return detail || "Invalid Anthropic API key";
    if (res.status === 429) return "Anthropic rate limit reached — try again in a moment";
    if (res.status === 400) return detail || "Anthropic rejected the request (HTTP 400)";
    return detail || `Anthropic request failed (HTTP ${res.status})`;
};

export type GenerateInterviewPrepInput = {
    jobName: string;
    jobDescription: string;
    candidateName: string;
    resumeSummary?: string | null;
    skills?: string[];
    experience?: { company: string; position: string; description: string }[];
    keyAccomplishments?: string[];
    stageName: string | null | undefined;
};

/**
 * Real Messages API call with the org's decrypted API key. Returns the
 * validated structured output, or { success: false, error } with the real
 * failure — a bad key / failed call never produces fake questions.
 */
export async function generate_interview_prep(
    apiKey: string,
    input: GenerateInterviewPrepInput,
): Promise<
    | { success: true; data: InterviewPrepOutput & { model: string; stageName: string | null } }
    | { success: false; error: string }
> {
    if (!apiKey?.trim()) {
        return { success: false, error: "No Anthropic API key configured" };
    }

    const stageName = input.stageName ?? null;
    const jobDescription = truncate(input.jobDescription, MAX_JOB_DESCRIPTION_CHARS);
    const resumeSummary = truncate(input.resumeSummary, MAX_RESUME_SUMMARY_CHARS);
    const experienceText = truncate(
        (input.experience ?? [])
            .map((e) => `${e.position} at ${e.company}: ${e.description ?? ""}`)
            .join("\n"),
        MAX_EXPERIENCE_CHARS,
    );

    const prompt = `You are an expert technical recruiter preparing structured interview questions for one candidate.

Job title: ${input.jobName}
Job description:
${jobDescription || "(no job description provided)"}

Candidate: ${input.candidateName}
Resume summary:
${resumeSummary || "(no resume summary available)"}
Skills: ${(input.skills ?? []).join(", ") || "(none listed)"}
Experience:
${experienceText || "(none listed)"}
Key accomplishments:
${(input.keyAccomplishments ?? []).join("; ") || "(none listed)"}

Current pipeline stage: ${stageName ?? "unknown"}
Stage focus: ${stage_focus_for(stageName)}

Ground every question in the job description and the candidate's actual resume material above. Do not invent skills, employers, or experience the candidate does not have — if the resume material is thin, say so in the insights and ask about the gaps instead of assuming. Return 8-12 questions across at least three categories (e.g. Technical, Behavioural, Role-specific, Motivation).

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "questions": [
    { "category": "<category>", "question": "<the question to ask>", "rationale": "<one sentence on what this question probes>" }
  ],
  "insights": {
    "summary": "<2 sentence plain-text summary of the candidate's fit for this stage>",
    "strengths": ["<evidence-backed strength>"],
    "risks": ["<gap, inconsistency, or thing to probe — empty array when none>"],
    "focusAreas": ["<what the interviewer should spend the most time on at this stage>"]
  }
}`;

    try {
        const res = await fetch(ANTHROPIC_MESSAGES_URL, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey.trim(),
                "anthropic-version": ANTHROPIC_VERSION,
            },
            body: JSON.stringify({
                model: ANTHROPIC_SCREENING_MODEL,
                max_tokens: 2048,
                temperature: 0.3,
                messages: [{ role: "user", content: prompt }],
            }),
            signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
            return { success: false, error: await anthropic_error_message(res) };
        }

        const body = (await res.json()) as {
            content?: { type?: string; text?: string }[];
        };
        const text = body?.content?.find((b) => b.type === "text")?.text ?? "";
        if (!text.trim()) {
            return { success: false, error: "Empty response from Claude" };
        }

        // Claude is instructed to return bare JSON; tolerate code fences.
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "");
        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            return { success: false, error: "Claude returned output that could not be parsed as interview questions" };
        }

        const validated = interviewPrepOutputSchema.safeParse(parsed);
        if (!validated.success) {
            return { success: false, error: "Claude returned interview questions in an unexpected shape" };
        }

        return {
            success: true,
            data: { ...validated.data, model: ANTHROPIC_SCREENING_MODEL, stageName },
        };
    } catch (err) {
        return {
            success: false,
            error: (err as Error).message || "Failed to generate interview questions",
        };
    }
}
