// ─────────────────────────────────────────────────────────────────────────────
// OpenAI resume scoring — server/worker-only (NOT a server action).
//
// Mirrors the Google scorer in `src/server/resume-processing.ts`
// (`score_resume`, Gemini) with the same contract: score 0–100 plus a
// fit/skills/experience breakdown and a short summary, against the same
// job title + description, from the same R2 resume extraction.
//
// Differences from the Google scorer, all deliberate:
//   - No OpenAI SDK dependency: a plain fetch to the Chat Completions
//     API with `response_format: { type: "json_object" }` (the same
//     dependency-free pattern `verifyGoogle` uses for its check call).
//   - The model is fixed to gpt-4o (per the plugin manifest) and is
//     returned in the result metadata by the provider, so the stored
//     score is always labelled with its source (see
//     `resume_score_model` on the applications table).
//   - Plain-text resumes: extractResumeText returns base64 for .txt
//     files; it is decoded to text here (Google sends the base64
//     through to Gemini unchanged).
//
// A bad key or a failed API call returns the real error — never a fake
// score. Callers must treat `success: false` as "no score", not retry
// with invented numbers.
// ─────────────────────────────────────────────────────────────────────────────
import { extractResumeText } from "@/server/resume-processing";

/** The model this scorer uses — fixed per the plugin manifest. */
export const OPENAI_RESUME_MODEL = "gpt-4o";

type ScoreBreakdown = { fit: number; skills: number; experience: number };

export type OpenAIResumeScore = {
    score: number;
    breakdown: ScoreBreakdown;
    summary: string;
};

const clamp_score = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value)));
};

/** Strip a ```json fence if the model wrapped its JSON anyway. */
const strip_fences = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    return trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
};

export const score_resume_with_openai = async (
    fileUrl: string,
    job_name: string,
    job_description: string,
    apiKey: string,
): Promise<
    | { success: true; data: OpenAIResumeScore }
    | { success: false; error: string }
> => {
    if (!apiKey) return { success: false, error: "No OpenAI API key configured" };

    try {
        // ── Extract the text ─────────────────────────────────────────────────
        const [mimeType, content] = await extractResumeText(fileUrl);
        // .txt files come back base64-encoded — decode so the model reads
        // text, not an opaque blob (PDF/DOCX already arrive as text).
        const resumeText = mimeType.includes("text/plain")
            ? Buffer.from(content, "base64").toString("utf-8")
            : content;

        // ── Build the prompt (same shape as the Google scorer) ─────────────
        const prompt = `You are an expert technical recruiter. Score the resume against the job description.
            Job Title: ${job_name}
            Job Description: ${job_description}
            Resume: ${resumeText}

            Return ONLY valid JSON — no markdown, no code fences, no explanation:
            {
            "score": <integer 0-100>,
            "breakdown": {
                "fit":        <integer 0-100>,
                "skills":     <integer 0-100>,
                "experience": <integer 0-100>
            },
            "summary": "<2 sentence plain-text summary of strengths and gaps>"
        }`;

        // ── Call the API ─────────────────────────────────────────────────────
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // The key is sent only to OpenAI, over HTTPS — never logged.
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: OPENAI_RESUME_MODEL,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(120_000),
        });

        if (!res.ok) {
            // 401 = the key itself is rejected. Anything else (429, 5xx,
            // network) is a verification/API failure, not proof the key
            // is bad — say so instead of telling the user the key is invalid.
            let detail = "";
            try {
                const body = (await res.json()) as { error?: { message?: string } };
                detail = body?.error?.message ?? "";
            } catch {
                // Non-JSON error body — fall through to the generic message.
            }
            if (res.status === 401) {
                return { success: false, error: detail || "Invalid OpenAI API key" };
            }
            return {
                success: false,
                error: detail || `OpenAI API error (HTTP ${res.status})`,
            };
        }

        const body = (await res.json()) as {
            choices?: { message?: { content?: string | null } }[];
        };
        const responseText = body.choices?.[0]?.message?.content ?? "";

        if (!responseText) {
            return { success: false, error: "Empty response from OpenAI" };
        }

        let data: unknown;
        try {
            data = JSON.parse(strip_fences(responseText));
        } catch {
            return { success: false, error: "OpenAI returned a response that was not valid JSON" };
        }

        // ── Validate — a missing or non-numeric score is a failure, never
        // a reason to invent one. Out-of-range values are clamped, not dropped.
        const parsed = data as Partial<OpenAIResumeScore> | null;
        const score = clamp_score(parsed?.score);
        const breakdown = parsed?.breakdown as Partial<ScoreBreakdown> | undefined;
        const fit = clamp_score(breakdown?.fit);
        const skills = clamp_score(breakdown?.skills);
        const experience = clamp_score(breakdown?.experience);
        const summary = typeof parsed?.summary === "string" ? parsed.summary : null;

        if (score === null || fit === null || skills === null || experience === null || summary === null) {
            return {
                success: false,
                error: "OpenAI returned an incomplete score (missing score, breakdown, or summary)",
            };
        }

        return {
            success: true,
            data: { score, breakdown: { fit, skills, experience }, summary },
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to score resume with OpenAI",
        };
    }
};
