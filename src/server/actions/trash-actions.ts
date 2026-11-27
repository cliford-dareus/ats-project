'use server';

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { hasPermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import {
    get_trash_counts_db,
    get_trash_items_db,
    restore_application_db,
    restore_candidate_db,
    restore_job_db,
    TrashItemType,
} from "@/server/queries/drizzle/trash";
import { permanent_delete_application_db } from "@/server/queries/drizzle/application";
import { permanent_delete_candidate } from "@/server/queries/drizzle/candidates";
import { permanent_delete_job_listing_db } from "@/server/queries/drizzle/job-listings";
import { delete_candidate_attachments } from "@/server/queries/mongo/attachment";
import { delete_candidate_details } from "@/server/queries/mongo/candidate-details";
import { delete_candidate_notes } from "@/server/queries/mongo/note";

// Trash is permission-gated with the EXISTING permissions — no new ones:
// viewing a type needs its :view permission, restoring or permanently
// deleting a type needs its :delete permission (the same people who can
// delete can restore / delete forever). orgId always comes from the Clerk
// session; every query below scopes to it, so Trash never touches rows
// from another org, including through joined/related entities.

const trashItemSchema = z.object({
    type: z.enum(["job", "candidate", "application"]),
    id: z.number().int().positive(),
});

const VIEW_PERMISSION: Record<TrashItemType, "job:view" | "candidate:view" | "application:view"> = {
    job: "job:view",
    candidate: "candidate:view",
    application: "application:view",
};

const DELETE_PERMISSION: Record<TrashItemType, "job:delete" | "candidate:delete" | "application:delete"> = {
    job: "job:delete",
    candidate: "candidate:delete",
    application: "application:delete",
};

const TYPE_LABEL: Record<TrashItemType, string> = {
    job: "Job",
    candidate: "Candidate",
    application: "Application",
};

const RESTORE_ACTION = {
    job: "job.restored",
    candidate: "candidate.restored",
    application: "application.restored",
} as const;

const PERMANENT_DELETE_ACTION = {
    job: "job.permanently_deleted",
    candidate: "candidate.permanently_deleted",
    application: "application.permanently_deleted",
} as const;

/** Which trash types the caller may see (one :view permission each). */
const get_visible_types = async (): Promise<TrashItemType[]> => {
    const types: TrashItemType[] = ["job", "candidate", "application"];
    const visible: TrashItemType[] = [];
    for (const type of types) {
        if (await hasPermission(VIEW_PERMISSION[type])) visible.push(type);
    }
    return visible;
};

export const get_trash_action = async () => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return { error: true, message: "There was an error loading Trash" };
    }

    const visibleTypes = await get_visible_types();
    if (visibleTypes.length === 0) {
        return { error: true, message: "You don't have permission to view Trash" };
    }

    const [items, counts] = await Promise.all([
        get_trash_items_db(orgId),
        get_trash_counts_db(orgId),
    ]);

    // Only return the types the caller may view.
    const filtered = {
        jobs: visibleTypes.includes("job") ? items.jobs : [],
        candidates: visibleTypes.includes("candidate") ? items.candidates : [],
        applications: visibleTypes.includes("application") ? items.applications : [],
    };
    const filteredCounts = {
        jobs: visibleTypes.includes("job") ? counts.jobs : 0,
        candidates: visibleTypes.includes("candidate") ? counts.candidates : 0,
        applications: visibleTypes.includes("application") ? counts.applications : 0,
    };

    return { items: filtered, counts: filteredCounts, visibleTypes };
};

/** Counts + most recently deleted items, for the Trash sidebar. */
export const get_trash_summary_action = async () => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return { error: true, message: "There was an error loading Trash" };
    }

    const visibleTypes = await get_visible_types();
    if (visibleTypes.length === 0) {
        return { counts: { jobs: 0, candidates: 0, applications: 0 }, recent: [] };
    }

    const [items, counts] = await Promise.all([
        get_trash_items_db(orgId),
        get_trash_counts_db(orgId),
    ]);

    const recent = [
        ...(visibleTypes.includes("job") ? items.jobs : []),
        ...(visibleTypes.includes("candidate") ? items.candidates : []),
        ...(visibleTypes.includes("application") ? items.applications : []),
    ]
        .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
        .slice(0, 5);

    return {
        counts: {
            jobs: visibleTypes.includes("job") ? counts.jobs : 0,
            candidates: visibleTypes.includes("candidate") ? counts.candidates : 0,
            applications: visibleTypes.includes("application") ? counts.applications : 0,
        },
        recent,
    };
};

export const restore_trash_item_action = async (unsafeData: z.infer<typeof trashItemSchema>) => {
    const { userId, orgId } = await auth();
    const parsed = await trashItemSchema.spa(unsafeData);
    if (!userId || !orgId || !parsed.success) {
        return { error: true, message: "There was an error restoring the item" };
    }

    const { type, id } = parsed.data;
    if (!(await hasPermission(DELETE_PERMISSION[type]))) {
        return { error: true, message: "You don't have permission to restore this item" };
    }

    const result =
        type === "job"
            ? await restore_job_db(id, orgId)
            : type === "candidate"
                ? await restore_candidate_db(id, orgId)
                : await restore_application_db(id, orgId);

    if (!result.success) {
        return { error: true, message: result.message };
    }

    await record_activity({
        action: RESTORE_ACTION[type],
        entity_type: type,
        entity_id: id,
        summary: `${TYPE_LABEL[type]} restored from Trash` +
            (result.restoredApplications > 0
                ? ` (${result.restoredApplications} application${result.restoredApplications === 1 ? "" : "s"} also restored)`
                : "") +
            (result.skippedApplications > 0
                ? ` (${result.skippedApplications} application${result.skippedApplications === 1 ? "" : "s"} left in Trash — their ${type === "job" ? "candidate" : "job"} is still deleted)`
                : ""),
    });

    return { success: true, message: `${TYPE_LABEL[type]} restored` };
};

export const permanent_delete_trash_item_action = async (unsafeData: z.infer<typeof trashItemSchema>) => {
    const { userId, orgId } = await auth();
    const parsed = await trashItemSchema.spa(unsafeData);
    if (!userId || !orgId || !parsed.success) {
        return { error: true, message: "There was an error deleting the item" };
    }

    const { type, id } = parsed.data;
    if (!(await hasPermission(DELETE_PERMISSION[type]))) {
        return { error: true, message: "You don't have permission to permanently delete this item" };
    }

    const result = await permanent_delete_one(type, id, orgId);
    if (!result.success) {
        return { error: true, message: result.message ?? "Item not found in Trash" };
    }

    await record_activity({
        action: PERMANENT_DELETE_ACTION[type],
        entity_type: type,
        entity_id: id,
        summary: `${TYPE_LABEL[type]} permanently deleted from Trash`,
    });

    return { success: true, message: `${TYPE_LABEL[type]} permanently deleted` };
};

// The permanent path is the old hard-delete behaviour, including the
// Mongo/R2 handling the old delete actions had. Mongo documents first
// (they have no FK cascade); the MySQL delete follows. No activity is
// recorded here — the caller records once (per item, or once per type
// for Empty Trash).
const permanent_delete_one = async (
    type: TrashItemType,
    id: number,
    orgId: string,
): Promise<{ success: boolean; message?: string }> => {
    if (type === "candidate") {
        // MySQL row first: if it isn't in Trash, nothing else is touched.
        const deleted = await permanent_delete_candidate(id, orgId);
        if (!deleted.deleted) {
            return { success: false, message: "Candidate not found in Trash" };
        }
        // Mongo documents have no FK cascade to the MySQL row.
        await delete_candidate_details(id);
        await delete_candidate_notes(id);
        await delete_candidate_attachments(id);
        return { success: true };
    }
    if (type === "application") {
        const deleted = await permanent_delete_application_db(id, orgId);
        return deleted.success ? { success: true } : { success: false, message: deleted.message };
    }
    const deleted = await permanent_delete_job_listing_db(id, orgId);
    return deleted.success ? { success: true } : { success: false, message: deleted.message };
};

/**
 * Permanently delete everything in Trash the caller is allowed to delete
 * (one :delete permission per type). Types the caller cannot delete are
 * left in place and reported, never touched. One activity record per
 * deleted type, with the count in the summary.
 */
export const empty_trash_action = async () => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return { error: true, message: "There was an error emptying Trash" };
    }

    const items = await get_trash_items_db(orgId);
    const deleted: Record<TrashItemType, number> = { job: 0, candidate: 0, application: 0 };
    const skipped: TrashItemType[] = [];

    for (const type of ["job", "candidate", "application"] as const) {
        const rows = type === "job" ? items.jobs : type === "candidate" ? items.candidates : items.applications;
        if (rows.length === 0) continue;
        if (!(await hasPermission(DELETE_PERMISSION[type]))) {
            skipped.push(type);
            continue;
        }
        for (const row of rows) {
            const result = await permanent_delete_one(type, row.id, orgId);
            if (result.success) deleted[type] += 1;
        }
        if (deleted[type] > 0) {
            await record_activity({
                action: PERMANENT_DELETE_ACTION[type],
                entity_type: type,
                entity_id: rows[0].id,
                summary: `Emptied Trash: ${deleted[type]} ${TYPE_LABEL[type].toLowerCase()}${deleted[type] === 1 ? "" : "s"} permanently deleted`,
            });
        }
    }

    const total = deleted.job + deleted.candidate + deleted.application;
    if (total === 0) {
        return { error: true, message: skipped.length > 0 ? "Nothing deleted — you don't have permission to permanently delete these items" : "Trash is already empty" };
    }
    return {
        success: true,
        message: `Permanently deleted ${total} item${total === 1 ? "" : "s"} from Trash` +
            (skipped.length > 0 ? ` (${skipped.map((t) => `${TYPE_LABEL[t].toLowerCase()}s`).join(", ")} left in place — missing permission)` : ""),
        deleted,
    };
};
