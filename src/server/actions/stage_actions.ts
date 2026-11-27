'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { FormErrors } from "@/types";
import { AuthzError, assertJobBelongsToOrg, canEditJob, canViewJob, hasPermission, requirePermission } from "@/server/permissions";
import { create_stage_for_job, get_stage_by_name, get_stage_by_name_for_job } from "@/server/queries/drizzle/stages";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";
import { JOB_STAGES } from "@/zod";

export const get_stage_by_name_action = async (stageName: string) => {
    const { userId } = await auth();
    const allowed = await canViewJob();
    if (!userId || !allowed) {
        return { error: true, message: "There was an error retrieving the stage" }
    }

    // stage_name is a MySQL enum — validate before querying so an arbitrary
    // string can't reach the DB layer (the caller treats a non-array
    // result as "Stage not found").
    const parsed = JOB_STAGES.safeParse(stageName);
    if (!parsed.success) {
        return { error: true, message: "Stage not found" }
    }

    return await get_stage_by_name(parsed.data);
};

// Job-scoped variant (S-1): resolves the stage by name within one job, so a
// stage-move can never pick up a same-named stage from another job/org.
// Same permission/validation as get_stage_by_name_action.
export const get_stage_by_name_for_job_action = async (stageName: string, jobId: number) => {
    const { userId } = await auth();
    const allowed = await canViewJob();
    if (!userId || !allowed) {
        return { error: true, message: "There was an error retrieving the stage" }
    }

    const parsed = JOB_STAGES.safeParse(stageName);
    if (!parsed.success || !Number.isInteger(jobId) || jobId <= 0) {
        return { error: true, message: "Stage not found" }
    }

    const stage = await get_stage_by_name_for_job(parsed.data, jobId);
    if (!stage) {
        return { error: true, message: "Stage not found" }
    }
    return stage;
};

// ── Create a stage for one job (B13) ──────────────────────────────────────────
// The "Add new stage" dialog in job-options submits here. Org-scoped and
// permission-gated (job:edit); the job is asserted to belong to the session
// org, and the name is deduped against that job's existing stages (the
// unique (job_id, stage_name) index is a backstop). The new stage is
// assigned to the creating user: the dialog has no member picker, and the
// old free-text "assign to" field could only ever store a raw string
// against the users_table FK. Stage triggers themselves are still out of
// scope — nothing here wires add_trigger_to_stage_action.
export const create_stage_action = async (prevState: FormErrors | undefined, formData: FormData) => {
    const jobId = Number(formData.get("job_id"));
    const stageName = formData.get("stage_name");
    const color = String(formData.get("color") ?? "").trim();

    if (!Number.isInteger(jobId) || jobId <= 0) {
        return { _form: "Invalid job." };
    }
    const parsedStage = JOB_STAGES.safeParse(stageName);
    if (!parsedStage.success) {
        return { stage_name: "Choose a valid stage name." };
    }
    // <input type="color"> always yields #rrggbb; anything else falls back
    // to the default rather than failing the submit.
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#3B82F6";

    try {
        const { userId, orgId } = await requirePermission("job:edit");
        await assertJobBelongsToOrg(jobId, orgId);

        const existing = await get_stage_by_name_for_job(parsedStage.data, jobId);
        if (existing) {
            return { stage_name: "This stage already exists for this job." };
        }

        await create_stage_for_job({
            jobId,
            stageName: parsedStage.data,
            color: safeColor,
            assignTo: userId,
            needSchedule: false,
        });
        revalidateDbCache({ tag: CACHE_TAGS.stages, id: String(jobId) });
        revalidatePath(`/jobs/${jobId}`);
        return { _success: "Stage added." };
    } catch (err) {
        if (err instanceof AuthzError) {
            return { _form: err.status === 404 ? "Job not found." : err.message };
        }
        console.error("create_stage_action failed:", err);
        return { _form: "There was an error adding the stage." };
    }
};

export const add_trigger_to_stage_action = async () => {
    const { userId } = await auth();
    // Stages belong to jobs — configuring a stage trigger is a job edit.
    const allowed = await canEditJob();

    if (!userId || !allowed) {
        return { error: true, message: "There was an error adding the trigger to the stage" }
    }

    // NOTE: stage triggers are not implemented — the query in
    // queries/drizzle/stages.ts is commented out (no `triggers` table in the
    // schema) and this action has no callers. Fail loudly instead of calling
    // a function that does not exist.
    return { error: true, message: "Stage triggers are not implemented yet" };
};


export const verifyResend = async (apiKey: string): Promise<{ success: boolean; message: string; error?: unknown }> => {
    // Plugin credential setup is plugin management (admin-only). Called from
    // the client-side Resend provider auth flow, so a session is present.
    const allowed = await hasPermission("plugin:manage");
    if (!allowed) {
        return { success: false, message: "Missing permission: plugin:manage" };
    }

    const key = apiKey?.trim();
    if (!key) {
        return { success: false, message: "API key is required" };
    }

    try {
        const resend = new Resend(key);

        // Real read: GET /domains returns 200 only for a valid key.
        // (The old check called emails.get("") and treated the absence of
        // one exact error message as success — any other error, e.g. a
        // 429 or 5xx, passed as "valid".)
        const { data, error } = await resend.domains.list();

        if (!error && data) {
            return {
                success: true,
                message: "API Key is valid",
            };
        }

        // The SDK returns the API's error body as `error`. Distinguish
        // the cases like verifyGoogle() does (200 = valid, 400/403 =
        // invalid, anything else = verification failure):
        //  • "invalid_api_Key" / "missing_api_key" → the key itself is bad.
        //  • "restricted_api_key" (401) → the key is REAL but sending-only:
        //    it can send email but Resend refuses every management endpoint
        //    for it, including /domains. It is valid for this plugin's job
        //    (sending), just unable to list domains — say so instead of
        //    rejecting a good key. Domain listing then fails separately
        //    with the same explanation (see listResendDomains).
        //  • anything else (rate_limit_exceeded, application_error, network)
        //    → verification failed, not proof the key is bad.
        const name = String((error as { name?: unknown } | null)?.name ?? "");
        const message = String((error as { message?: unknown } | null)?.message ?? "");
        if (name === "invalid_api_Key" || name === "missing_api_key" || message === "API Key is invalid") {
            console.error("Resend API Key Verification Failed:", error);
            return {
                success: false,
                message: message || "Invalid API Key",
                error
            };
        }
        if (name === "restricted_api_key") {
            return {
                success: true,
                message: "API Key is valid (sending-only access — a full-access key is needed to list verified domains)",
            };
        }
        console.error("Resend API Key Verification Failed:", error);
        return {
            success: false,
            message: message ? `Resend verification failed: ${message}` : "Resend verification failed",
            error
        };

    } catch (err) {
        console.error("Resend Verification Error:", err);
        return {
            success: false,
            message: err instanceof Error ? err.message : "Failed to verify API key",
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Returns pre-filtered plugin data to the client; credentials never leak.
// ─────────────────────────────────────────────────────────────────────────────
import type { InstalledPlugin } from "../../types";
import { Resend } from "resend";
import {getOrgPluginFlags, getOrgPluginState} from "@/server/actions/plugin-actions";

// ── Main server action ────────────────────────────────────────────────────────
// Single DB call. Builds both flags (for feature gating) and
// installed[] (for initializing the client registry) in one pass.

// export async function getPluginSettings(organizationId: string, pluginId: string) {
//     const result = await db.query.organizationPlugins.findFirst({
//         where: and(
//             eq(organizationPlugins.organizationId, organizationId),
//             eq(organizationPlugins.pluginId, pluginId)
//         ),
//         columns: { settings: true },
//     });

//     return result?.settings || {};
// }

// export async function updatePluginSettings(
//     organizationId: string,
//     pluginId: string,
//     settings: any
// ) {
//     await db.insert(organizationPlugins)
//         .values({
//             organizationId,
//             pluginId,
//             enabled: true,
//             settings,
//         })
//         .onConflictDoUpdate({
//             target: [organizationPlugins.organizationId, organizationPlugins.pluginId],
//             set: { settings, updatedAt: new Date() },
//         });
// }

// ── Convenience: just the flags (for lightweight feature-gating checks) ───────
// Flags only — safe for any org member. The org always comes from the
// Clerk session (the argument is kept for call-site compatibility and
// ignored); getOrgPluginState is admin-only and must not be used here.
export async function getEnabledPluginFlags(orgId: string): Promise<Record<string, boolean>> {
    void orgId;
    return getOrgPluginFlags();
};

// ── Convenience: just the installed ─────────
export async function getInstalledPlugins(orgId: string): Promise<InstalledPlugin[]> {
    const { installed } = await getOrgPluginState(orgId)
    return installed
};
