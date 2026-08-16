'use server';

import { auth } from "@clerk/nextjs/server";
import { canCreateJob } from "@/server/permissions";
import { add_trigger_to_stage, get_stage_by_name } from "@/server/queries/drizzle/stages";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { addTaskToQueue } from "../queries";

export const get_stage_by_name_action = async (stageName: string) => {
    const { userId } = await auth();
    if (!userId) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await get_stage_by_name(stageName);
};

export const add_trigger_to_stage_action = async (stageId: number, action: TriggerAction) => {
    const { userId } = await auth();
    // const {success, data} = await candidateForm.spa(unsafeData);
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await add_trigger_to_stage(stageId, action);
};

type AddTaskToQueueActionParams = {
    applicationId: number;
    action: TriggerAction;
    jobId: number;
    stageName?: string;
};

// MOVE LATER
export const add_task_to_queue_action = async (unsafeData: AddTaskToQueueActionParams) => {
    const { userId } = await auth();
    const canCreate = await canCreateJob(userId);

    if (!userId || !canCreate) {
        return { error: true, message: "There was an error creating your product" }
    }

    return await addTaskToQueue(unsafeData);
};

export const verifyResend = async (apiKey: string): Promise<{ success: boolean; message: string; error?: unknown }> => {
    try {
        const resend = new Resend(apiKey);

        // Make a lightweight call to verify the key
        const { data, error } = await resend.emails.get("");

        if (error?.message === "API Key is invalid") {
            console.error("Resend API Key Verification Failed:", error);
            return {
                success: false,
                message: error.message || "Invalid API Key",
                error
            };
        }

        return {
            success: true,
            message: "API Key is valid",
        };

    } catch (err: any) {
        console.error("Resend Verification Error:", err);
        return {
            success: false,
            message: err.message || "Failed to verify API key",
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Returns pre-filtered plugin data to the client; credentials never leak.
// ─────────────────────────────────────────────────────────────────────────────
import { AVAILABLE_PLUGINS } from "@/plugins/registry";
import type { InstalledPlugin, OrgPluginRecord, OrgPluginState } from "../../types";
import { Resend } from "resend";
import {getOrgPluginState} from "@/server/actions/plugin-actions";

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
export async function getEnabledPluginFlags(
    orgId: string
): Promise<Record<string, boolean>> {
    const { flags } = await getOrgPluginState(orgId);
    return flags;
};

// ── Convenience: just the installed ─────────
export async function getInstalledPlugins(orgId: string): Promise<InstalledPlugin[]> {
    const { installed } = await getOrgPluginState(orgId)
    return installed
};
