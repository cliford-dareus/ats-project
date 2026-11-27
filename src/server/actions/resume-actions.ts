'use server';

import { auth } from '@clerk/nextjs/server';
import { candidates } from '@/drizzle/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/drizzle/db';
import { create_candidate_details, get_candidate_details, update_candidate_details } from '../queries/mongo/candidate-details';
import { CACHE_TAGS, revalidateDbCache } from '@/lib/cache';
import { canEditCandidate } from '@/server/permissions';
import { generate, summarizeFromResume } from '@/server/resume-processing';

// NOTE: the pure resume logic (summarizeFromResume, generate, extractResumeText,
// score_resume) lives in `@/server/resume-processing` — a plain server-only
// module, NOT a server action. It must never be exported from this file:
// every export here becomes a public RPC endpoint. The Google plugin provider
// imports the lib directly (it runs in the BullMQ worker with no user session).

export const create_application_summary = async (candidate_id: number) => {
    // Get the candidate ID from the session
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
        return { success: false, error: 'Unauthorized' };
    }

    // Writes candidate details + basic info — a candidate edit.
    const allowed = await canEditCandidate();
    if (!allowed) {
        return { success: false, error: 'Missing permission: candidate:edit' };
    }

    // Get the candidate resume path from the database — scoped to the session
    // org so one org can never summarize another org's candidate.
    const [candidate] = await db.select({
        cv_path: candidates.cv_path,
        id: candidates.id
    })
        .from(candidates)
        .where(and(
            eq(candidates.id, candidate_id),
            eq(candidates.organization, orgId),
            isNull(candidates.deleted_at)
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
            .where(and(
                eq(candidates.id, candidate.id),
                eq(candidates.organization, orgId)
            ));

        revalidateDbCache({ tag: CACHE_TAGS.candidates, orgId });

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

    // Writes candidate details — a candidate edit.
    const allowed = await canEditCandidate();
    if (!allowed) {
        return { success: false, error: 'Missing permission: candidate:edit' };
    }

    const [candidate] = await db.select({
        id: candidates.id
    })
        .from(candidates)
        .where(and(
            eq(candidates.id, candidate_id),
            eq(candidates.organization, orgId),
            isNull(candidates.deleted_at)
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
        revalidateDbCache({ tag: CACHE_TAGS.candidates, orgId });

        return { success: true, data: updatedCandidateDetails };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update candidate details' };
    }
};
