import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
    activity_log,
    applications,
    candidates,
    interviews,
    job_listings,
} from "@/drizzle/schema";

export type ActivityLogEntry = {
    id: number;
    actor_name: string;
    action: string;
    entity_type: "job" | "candidate" | "application" | "interview" | "plugin";
    entity_id: number;
    summary: string;
    created_at: Date;
    /** Detail-page href when the entity still exists, else null. */
    entity_href: string | null;
};

/**
 * One org's activity entries, newest first, with a detail-page link for
 * each entry whose entity still exists. Entries whose entity was deleted
 * (including Trash deletions) keep their row — they just lose the link.
 * Everything is scoped to the session org; another org's rows can never
 * appear here.
 */
export const get_activity_log = async (
    orgId: string,
    opts?: { limit?: number; offset?: number },
): Promise<{ total: number; entries: ActivityLogEntry[] }> => {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    const [rows, countRows] = await Promise.all([
        db
            .select()
            .from(activity_log)
            .where(eq(activity_log.organization_id, orgId))
            .orderBy(desc(activity_log.created_at), desc(activity_log.id))
            .limit(limit)
            .offset(offset),
        db
            .select({ total: sql<number>`count(*)` })
            .from(activity_log)
            .where(eq(activity_log.organization_id, orgId)),
    ]);
    const total = Number(countRows[0]?.total ?? 0);

    // Batch existence checks per entity type (one query each, not N).
    // 'plugin' entries have no entity to link to (plugins have no numeric
    // id — entity_id is always 0), so no href branch exists for them and
    // entity_href stays null by design.
    const idsByType: Record<ActivityLogEntry["entity_type"], Set<number>> = {
        job: new Set(),
        candidate: new Set(),
        application: new Set(),
        interview: new Set(),
        plugin: new Set(),
    };
    for (const row of rows) idsByType[row.entity_type].add(row.entity_id);

    const hrefs = new Map<string, string>();
    if (idsByType.job.size > 0) {
        const existing = await db
            .select({ id: job_listings.id })
            .from(job_listings)
            .where(
                and(
                    inArray(job_listings.id, [...idsByType.job]),
                    eq(job_listings.organization, orgId),
                ),
            );
        for (const { id } of existing) hrefs.set(`job:${id}`, `/jobs/${id}`);
    }
    if (idsByType.candidate.size > 0) {
        const existing = await db
            .select({ id: candidates.id })
            .from(candidates)
            .where(
                and(
                    inArray(candidates.id, [...idsByType.candidate]),
                    eq(candidates.organization, orgId),
                ),
            );
        for (const { id } of existing) hrefs.set(`candidate:${id}`, `/candidates/${id}`);
    }
    if (idsByType.application.size > 0) {
        const existing = await db
            .select({ id: applications.id })
            .from(applications)
            .where(
                and(
                    inArray(applications.id, [...idsByType.application]),
                    eq(applications.organization, orgId),
                ),
            );
        for (const { id } of existing) hrefs.set(`application:${id}`, `/applications/${id}`);
    }
    if (idsByType.interview.size > 0) {
        // Interviews have no own detail page — link to the application
        // the interview belongs to.
        const existing = await db
            .select({ id: interviews.id, applications_id: interviews.applications_id })
            .from(interviews)
            .where(
                and(
                    inArray(interviews.id, [...idsByType.interview]),
                    eq(interviews.organization, orgId),
                ),
            );
        for (const { id, applications_id } of existing) {
            if (applications_id) hrefs.set(`interview:${id}`, `/applications/${applications_id}`);
        }
    }

    return {
        total,
        entries: rows.map((row) => ({
            id: row.id,
            actor_name: row.actor_name,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            summary: row.summary,
            created_at: row.created_at,
            entity_href: hrefs.get(`${row.entity_type}:${row.entity_id}`) ?? null,
        })),
    };
};
