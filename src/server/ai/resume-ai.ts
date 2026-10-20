// Server/worker-only AI helpers. Deliberately NOT "use server": these read arbitrary
// R2 keys and spend LLM quota, so they must only be reached through guarded actions
// (src/server/actions/resume-actions.ts) or the worker.

import { GoogleGenAI, Type } from "@google/genai";
import { r2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';


const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export const summarizeFromResume = async (resumeKey: string) => {
    try {
        const [type, base64] = await extractResumeText(resumeKey);

        // 3. Create good prompt
        const summarize = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    inlineData: {
                        mimeType: type,
                        data: base64
                    }
                },
                {
                    text: "Extract information from this resume. Return the data in JSON format with the following structure: { name: string, email: string, role: string, resumeSummary: string, skills: string[], key_accomplishments: string[] *key_accomplishments is the list of key accomplishments in the work experience,make them 10 to 15 words length sentence or shorter, experience: { company: string, position: string, period: string, startDate: string, endDate: string, current: boolean, description: string, totalExperience: number }[], education: { school: string, degree: string, fieldOfStudy: string, graduationDate: string }[], references: { name: string, email: string, company: string, relationship: string, phone: string }[] }. If a field is not found, leave it empty or null."
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        email: { type: Type.STRING },
                        role: { type: Type.STRING },
                        resumeSummary: { type: Type.STRING },
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        key_accomplishments: { type: Type.ARRAY, items: { type: Type.STRING } },
                        experience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    company: { type: Type.STRING },
                                    position: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    startDate: { type: Type.STRING },
                                    endDate: { type: Type.STRING },
                                    current: { type: Type.BOOLEAN },
                                    description: { type: Type.STRING },
                                    totalExperience: { type: Type.NUMBER }
                                }
                            }
                        },
                        education: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    school: { type: Type.STRING },
                                    degree: { type: Type.STRING },
                                    fieldOfStudy: { type: Type.STRING },
                                    graduationDate: { type: Type.STRING }
                                }
                            }
                        },
                        references: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    email: { type: Type.STRING },
                                    company: { type: Type.STRING },
                                    relationship: { type: Type.STRING },
                                    phone: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(summarize.text || "{}");
        return { success: true, data };
    } catch (err) {
        // console.error(err);
        return { success: false, error: (err as Error)?.message || 'Failed to summarize resume' };
    }
};

export const generate = async (candidate_id: number, candidateDetails: Record<string, any>, missing_fields: string[]) => {
    try {
        const result = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    inlineData: {
                        mimeType: 'text/plain',
                        data: Buffer.from(JSON.stringify(candidateDetails, null, 2)).toString('base64')
                    }
                },
                {
                    text: `You are an expert HR professional and technical recruiter.
                        Based on the candidate information provided, generate high-quality, professional content to complete or enhance the candidate profile.

                        Focus on filling these missing fields: ${missing_fields.join(', ')}.

                        Return ONLY a valid JSON object with the following structure (do not include any extra text, explanations, or markdown and do not include any fields that are not requested/in the missing_fields list):

                        {
                            name: string,
                            email: string,
                            role: string,
                            resumeSummary: string,
                            skills: string[],
                            key_accomplishments: string[] *key_accomplishments is the list of key accomplishments in the work experience,make them 10 to 15 words length sentence or shorter,
                            experience: { company: string, position: string, period: string, startDate: string, endDate: string, current: boolean, description: string, totalExperience: number }[],
                            education: { school: string, degree: string, fieldOfStudy: string, graduationDate: string }[],
                            references: { name: string, email: string, company: string, relationship: string, phone: string }[]
                        }

                        Make the content realistic, achievement-oriented, and professional. Use the existing information as ground truth — never fabricate contradictions.` }
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        const data = JSON.parse(result.text || "{}");
        return { success: true, data };
    } catch (err) {
        return { success: false, error: (err as Error)?.message || 'Failed to summarize text' };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE INTERGRATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const extractResumeText = async (fileUrl: string): Promise<string[]> => {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileUrl,
    });

    const response = await r2Client.send(command);
    const arrayBuffer = await response.Body?.transformToByteArray?.()

    if (!arrayBuffer) throw new Error('Failed to download file');

    // 2. Convert to Buffer & extract text
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // PDF — use pdf-parse
    if (response.ContentType!.includes("pdf")) {
        const { default: pdfParse } = await import("pdf-parse");
        const { text } = await pdfParse(buffer);
        return [response.ContentType!, text];
    }

    // DOCX — use mammoth
    if (response.ContentType!.includes("wordprocessingml") || fileUrl.endsWith(".docx")) {
        const { default: mammoth } = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer });
        return [response.ContentType!, value];
    }

    // TXT
    return [response.ContentType!, base64];
};

// ─────────────────────────────────────────────────────────────────────────────
// Integration 1 — Resume Score
// Fires on: candidate_applied, resume_uploaded
// Sends:    Automatically score resume
// ─────────────────────────────────────────────────────────────────────────────
export const score_resume = async (fileUrl: string, job_name: string, job_description: string, apiKey: string) => {
    if (!apiKey) return { success: false, error: "No Google API key configured" };
    const genAIG = new GoogleGenAI({ apiKey: apiKey });


    try {
        // ── Extract the text ─────────────────────────────────────────────────
        const [mimeType, base64] = await extractResumeText(fileUrl);

        // ── Build the prompt ─────────────────────────────────────────────────
        const prompt = `You are an expert technical recruiter. Score the resume against the job description.
            Job Title: ${job_name}
            Job Description: ${job_description}
            Resume: ${base64}

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
        const result = await genAIG.models.generateContent({
            model: "gemini-2.5-flash",        // ← gemini-3-flash doesn't exist yet
            contents: [{
                role: "user",
                parts: [{ text: prompt }],
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        breakdown: {
                            type: Type.OBJECT,
                            properties: {
                                fit: { type: Type.NUMBER },
                                skills: { type: Type.NUMBER },
                                experience: { type: Type.NUMBER }
                            }
                        },
                        summary: { type: Type.STRING }
                    },
                    required: ["score", "breakdown", "summary"]
                }
            }
        });

        // ── Extract text ─────────────────────────────────────────────────────
        // result.text is a getter on the response object — check candidates first
        const responseText =
            result.candidates?.[0]?.content?.parts?.[0]?.text ??
            result.text ??
            "";

        console.log("[Google] Raw response:", responseText);

        if (!responseText) {
            throw new Error("Empty response from Gemini");
        }

        const data = JSON.parse(responseText);

        return {
            success: true,
            data,
        };
    } catch (err) {
        return { success: false, error: (err as Error)?.message || 'Failed to summarize text' };
    }
};
