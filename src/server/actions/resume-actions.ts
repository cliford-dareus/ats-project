'use server';

import pdfParse from 'pdf-parse';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { candidates } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '@/drizzle/db';
import { create } from 'domain';
import { create_candidate_details } from '../queries/mongo/candidate-details';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export const summarizeResume = async (resumePath: string) => {
    try {
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('resumes') // your bucket name
            .download(resumePath);

        if (downloadError || !fileData) {
            throw new Error(`Failed to download resume: ${downloadError?.message}`);
        };

        // 2. Convert to Buffer & extract text
        const arrayBuffer = await fileData.arrayBuffer();
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
        const response = await genAI.models.generateContent({
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

        const data = JSON.parse(response.text || "{}");

        return { success: true, data };
    } catch (err: any) {
        // console.error(err);
        return { success: false, error: err.message || 'Failed to summarize resume' };
    }
};

export const create_application_summary = async (candidate_id: number) => {
    // Get the candidate ID from the session
    const { orgId, userId } = await auth();

    // Get the candidate resume path from the database
    const candidate = await db.select({ path: candidates.cv_path })
        .from(candidates)
        .where(and(
            eq(candidates.id, candidate_id),
            // eq(candidates.org_id, orgId)
        ));

    // Summarize the resume
    const summary = await summarizeResume(candidate[0].path);
    // Add the summary to the database
    if (summary.success) {
        await create_candidate_details({
            candidate_id: candidate_id,
            resumeSummary: summary.data.resumeSummary,
            skills: summary.data.skills,
            experience: summary.data.experience,
            education: summary.data.education
        });

        await db.update(candidates)
            .set({
                email: summary.data.email,
                name: summary.data.name,
                // role: summary.data.role
            })
            .where(eq(candidates.id, candidate_id));

        revalidateDbCache({ tag: CACHE_TAGS.candidates });

        return { success: true, data: summary.data };
    };

    return { success: false, error: summary.error };
};
