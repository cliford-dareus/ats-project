'use server';

import { GoogleGenAI, Type } from "@google/genai";
import { r2Client } from '@/lib/r2';
import { auth } from '@clerk/nextjs/server';
import { candidates } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '@/drizzle/db';
import { create_candidate_details, get_candidate_details, update_candidate_details } from '../queries/mongo/candidate-details';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export const summarizeFromResume = async (resumeKey: string) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: resumeKey,
        });

        const response = await r2Client.send(command);
        const arrayBuffer = await response.Body?.transformToByteArray?.()

        if (!arrayBuffer) throw new Error('Failed to download file');

        // 2. Convert to Buffer & extract text
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        // 3. Create good prompt
        const summarize = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    inlineData: {
                        mimeType: response.ContentType,
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
        return { success: false, error: err?.message || 'Failed to summarize resume' };
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
        return { success: false, error: err?.message || 'Failed to summarize text' };
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
    const summaryResult = await summarizeFromResume(candidate.cv_path);

    if (!summaryResult.success) {
        return { success: false, error: summaryResult.error };
    }

    const { data } = summaryResult;
    // Add the summary to the database
    try {
        // Save structured details
        // Check if candidate already has details
        await create_candidate_details({
            candidate_id,
            resumeSummary: data.resumeSummary,
            skills: data.skills,
            key_accomplishments: data.key_accomplishments,
            experience: data.experience,
            education: data.education,
            references: data.references,
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
                key_accomplishments: data.key_accomplishments,
                resumeSummary: data.resumeSummary,
                skills: data.skills,
                experience: data.experience,
                education: data.education,
                references: data.references,
            },
        };
    } catch (err: any) {
        console.error(err);
        return { success: false, error: 'Failed to save summary to database' };
    }
};

export const generate_missing_fields = async (candidate_id: number, missing_fields: string[]) => {
    // Get the candidate ID from the session
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
        return { success: false, error: 'Unauthorized' };
    }

    const [candidate] = await db.select({
        id: candidates.id
    })
        .from(candidates)
        .where(and(
            eq(candidates.id, candidate_id),
            eq(candidates.organization, orgId)
        ));

    if (!candidate) {
        return { success: false, error: 'Candidate not found' };
    }

    // get candidate details from the database mongodb
    const candidateDetails = await get_candidate_details(candidate_id);
    if (!candidateDetails) {
        return { success: false, error: 'Candidate details not found' };
    }

    // generate the missing fields
    const generatedFields = await generate(candidate_id, JSON.parse(candidateDetails), missing_fields);

    if (!generatedFields.success) {
        return { success: false, error: generatedFields.error };
    }

    const { data } = generatedFields;
    try {
        // update candidate details in the database mongodb
        const updatedCandidateDetails = await update_candidate_details(candidate_id, data);
        if (!updatedCandidateDetails) {
            return { success: false, error: 'Failed to update candidate details' };
        }
        revalidateDbCache({ tag: CACHE_TAGS.candidates });

        return { success: true, data: updatedCandidateDetails };
    } catch (err) {
        return { success: false, error: err?.message || 'Failed to update candidate details' };
    }
};
