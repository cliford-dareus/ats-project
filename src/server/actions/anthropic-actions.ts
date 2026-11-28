'use server';

// Claude Candidate Screening (anthropic-screening plugin): on-demand
// interview-question generation for one application. Server action =
// auth check + delegate to the Anthropic helper; the org's API key is
// decrypted server-side only (never returned to the client) and the
// generated output is stored in `interview_prep` (migration 0016).

import { db } from "@/drizzle/db";
import { interview_prep, job_listings } from "@/drizzle/schema";
import { generate_interview_prep } from "@/server/ai/anthropic-screening";
import { get_application_by_id } from "@/server/queries";
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import { db_get_org_plugin_state } from "@/server/queries/drizzle/plugin-queries";
import { getAuthOrThrow, requirePermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import { and, desc, eq, sql } from "drizzle-orm";
import type { InterviewPrepDTO } from "@/types";

const serialize_prep = (row: typeof interview_prep.$inferSelect): InterviewPrepDTO => ({
    id: row.id,
    application_id: row.application_id,
    stage_name: row.stage_name,
    model: row.model,
    questions: row.questions,
    insights: row.insights,
    generated_at: row.generated_at.toISOString(),
});

/**
 * Generate (or regenerate) Claude interview questions + stage-aware
 * insights for one application. Gated on candidate:evaluate — the
 * permission for evaluating a candidate — held by admin, recruiter and
 * hiring_manager, not by org:member. The application, job and candidate
 * details are all loaded server-side from the session org; nothing
 * client-supplied is trusted. A failed Claude call returns the real
 * error — never fake questions.
 */
export async function generate_interview_prep_action(
    applicationId: number,
): Promise<{ success: boolean; prep?: InterviewPrepDTO; message: string }> {
    const { orgId } = await requirePermission("candidate:evaluate");

    const [application] = await get_application_by_id(applicationId, orgId);
    if (!application) {
        return { success: false, message: "Application not found" };
    }
    // Left-joined job/candidate columns are nullable in the row type.
    if (!application.job_id || !application.candidate_id) {
        return { success: false, message: "Application is missing its job or candidate" };
    }
    const candidateName = application.candidate_name ?? "the candidate";

    // Plugin must be installed + active with a usable (decryptable) key.
    // db_get_org_plugin_state is the server-only decrypted read; a
    // flagged plugin (credentialsError) is never reported as installed.
    const state = await db_get_org_plugin_state(orgId);
    const plugin = state.installed.find((p) => p.id === "anthropic-screening");
    const apiKey = plugin?.settings.credentials?.apiKey;
    if (!plugin || !apiKey) {
        return {
            success: false,
            message: "Claude Candidate Screening is not connected — add an Anthropic API key in Settings → Plugins → Claude Candidate Screening.",
        };
    }

    const [job] = await db
        .select()
        .from(job_listings)
        .where(and(eq(job_listings.id, application.job_id), eq(job_listings.organization, orgId)))
        .limit(1);
    if (!job) {
        return { success: false, message: "Job not found for this application" };
    }

    // Resume material lives in Mongo (candidate-details), org-checked
    // inside get_candidate_details; a missing/empty details doc is not
    // fatal — Claude is told what is missing and probes the gaps instead
    // of inventing experience.
    let details: {
        resumeSummary?: string;
        skills?: string[];
        experience?: { company: string; position: string; description: string }[];
        key_accomplishments?: string[];
    } = {};
    try {
        const parsed: unknown = JSON.parse(await get_candidate_details(application.candidate_id));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            details = parsed as typeof details;
        }
    } catch {
        details = {};
    }

    const stageName = application.current_stage ?? null;
    const result = await generate_interview_prep(apiKey, {
        jobName: job.name,
        jobDescription: job.description,
        candidateName,
        resumeSummary: details.resumeSummary,
        skills: details.skills,
        experience: details.experience,
        keyAccomplishments: details.key_accomplishments,
        stageName,
    });

    if (!result.success) {
        return { success: false, message: result.error };
    }

    // Regenerate appends a row; the page renders the latest.
    const [row] = await db
        .insert(interview_prep)
        .values({
            application_id: application.id,
            organization: orgId,
            stage_name: result.data.stageName,
            model: result.data.model,
            questions: result.data.questions,
            insights: result.data.insights,
        })
        .$returningId();

    await record_activity({
        action: "plugin.interview_prep_generated",
        entity_type: "application",
        entity_id: application.id,
        summary: `Generated Claude interview questions for ${candidateName} (${stageName ?? "unknown stage"})`,
    });

    const [inserted] = await db
        .select()
        .from(interview_prep)
        .where(eq(interview_prep.id, row.id))
        .limit(1);
    if (!inserted) {
        return { success: false, message: "Questions were generated but could not be saved" };
    }

    return {
        success: true,
        prep: serialize_prep(inserted),
        message: "Interview questions generated",
    };
}

/**
 * Latest stored prep for one application (plus how many generations
 * exist). Read-only: application:view. Returns null prep when nothing
 * has been generated yet — the card then offers Generate.
 */
export async function get_interview_prep_action(
    applicationId: number,
): Promise<{ success: boolean; prep: InterviewPrepDTO | null; total: number; message?: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("application:view");

    const [application] = await get_application_by_id(applicationId, orgId);
    if (!application) {
        return { success: false, prep: null, total: 0, message: "Application not found" };
    }

    const rows = await db
        .select()
        .from(interview_prep)
        .where(
            and(
                eq(interview_prep.application_id, applicationId),
                eq(interview_prep.organization, orgId),
            ),
        )
        .orderBy(desc(interview_prep.generated_at), desc(interview_prep.id))
        .limit(1);
    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(interview_prep)
        .where(
            and(
                eq(interview_prep.application_id, applicationId),
                eq(interview_prep.organization, orgId),
            ),
        );

    return {
        success: true,
        prep: rows[0] ? serialize_prep(rows[0]) : null,
        total: Number(count),
    };
}
