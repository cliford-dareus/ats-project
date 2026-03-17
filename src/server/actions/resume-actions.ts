'use server';

import pdfParse from 'pdf-parse';
import { GoogleGenAI, Type } from "@google/genai";
import { r2Client } from '@/lib/r2';
import { auth } from '@clerk/nextjs/server';
import { candidates } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '@/drizzle/db';
import { create } from 'domain';
import { create_candidate_details } from '../queries/mongo/candidate-details';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export const summarizeResume = async (resumeKey: string) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: resumeKey,
        });

        const response = await r2Client.send(command);
        const arrayBuffer = await response.Body?.transformToByteArray?.() ||
            await response.Body?.arrayBuffer?.();

        if (!arrayBuffer) throw new Error('Failed to download file');

        // 2. Convert to Buffer & extract text
        const buffer = Buffer.from(arrayBuffer);

        const pdfData = await pdfParse(buffer);
        const text = pdfData.text
            .replace(/\s+/g, ' ')          // normalize spaces
            .trim()
            .slice(0, 25000);              // safety limit (~40-50k tokens max)

        if (text.length < 100) {
            throw new Error('Could not extract meaningful text from PDF');
        }

        // 3. Create good prompt
        const summarize = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    inlineData: {
                        mimeType: Type.STRING,
                        data: text
                    }
                },
                {
                    text: "Extract information from this resume. Return the data in JSON format with the following structure: { name: string, email: string, role: string, resumeSummary: string, skills: string[], experience: { company: string, role: string, period: string, description: string, totalExperience: number }[], education: string[] }. If a field is not found, leave it empty or null."
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
                        experience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    company: { type: Type.STRING },
                                    role: { type: Type.STRING },
                                    period: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    totalExperience: { type: Type.NUMBER }
                                }
                            }
                        },
                        education: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });

        const data = JSON.parse(summarize.text || "{}");

        return { success: true, data };
    } catch (err: any) {
        // console.error(err);
        return { success: false, error: err.message || 'Failed to summarize resume' };
    }
};

export const create_application_summary = async (candidate_id: number) => {
    // Get the candidate ID from the session
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
        return { success: false, error: 'Unauthorized' };
    }

    // Get the candidate resume path from the database
    const [candidate] = await db.select({
        cv_path: candidates.cv_path,
        id: candidates.id
    })
        .from(candidates)
        .where(and(
            eq(candidates.id, candidate_id),
            // eq(candidates.org_id, orgId)
        ));

    if (!candidate) {
        return { success: false, error: 'Candidate not found' };
    }

    if (!candidate.cv_path || candidate.cv_path.startsWith('no-resume-')) {
        return { success: false, error: 'No resume attached to this candidate' };
    }

    // Summarize the resume
    const summaryResult = await summarizeResume(candidate.cv_path);

    if (!summaryResult.success) {
        return { success: false, error: summaryResult.error };
    }

    const { data } = summaryResult;
    // Add the summary to the database
    try {
        // Save structured details
        await create_candidate_details({
            candidate_id,
            resumeSummary: data.resumeSummary,
            skills: data.skills,
            experience: data.experience,
            education: data.education,
        });

        // Update basic candidate info
        await db
            .update(candidates)
            .set({
                name: data.name || undefined,
                email: data.email || undefined,
            })
            .where(eq(candidates.id, candidate.id));

        revalidateDbCache({ tag: CACHE_TAGS.candidates });

        return {
            success: true,
            data: {
                name: data.name,
                email: data.email,
                resumeSummary: data.resumeSummary,
                skills: data.skills,
                experience: data.experience,
                education: data.education,
            },
        };
    } catch (err: any) {
        console.error(err);
        return { success: false, error: 'Failed to save summary to database' };
    }
};
