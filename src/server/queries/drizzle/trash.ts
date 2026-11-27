import { db } from "@/drizzle/db";
import { applications, candidates, job_listings } from "@/drizzle/schema";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

// ── Trash reads ─────────────────────────────────────────────────────────────
// Reads are plain selects (no dbCache): trash contents change on every
// delete/restore, and a stale trash list would be worse than an uncached
// one. The list/detail pages still revalidate through the jobs /
// candidates / applications tags, which the delete/restore paths below
// (and the soft-delete paths) already invalidate.

export type TrashItemType = "job" | "candidate" | "application";

export type TrashItem = {
    type: TrashItemType;
    id: number;
    /** Primary line: job title / candidate name / "Candidate — Job". */
    title: string;
    /** Secondary line: location/status, email, or job name. */
    subtitle: string;
    deletedAt: Date;
    createdAt: Date;
};

export type TrashItems = {
    jobs: TrashItem[];
    candidates: TrashItem[];
    applications: TrashItem[];
};

const revalidateTrash = (orgId: string) => {
    revalidateDbCache({ tag: CACHE_TAGS.jobs, orgId });
    revalidateDbCache({ tag: CACHE_TAGS.candidates, orgId });
    revalidateDbCache({ tag: CACHE_TAGS.applications, orgId });
};

/** All soft-deleted rows for the org, newest first. Org-scoped throughout. */
export const get_trash_items_db = async (orgId: string): Promise<TrashItems> => {
    const [jobs, candidateRows, applicationRows] = await Promise.all([
        db
            .select({
                id: job_listings.id,
                name: job_listings.name,
                location: job_listings.location,
                status: job_listings.status,
                deleted_at: job_listings.deleted_at,
                created_at: job_listings.created_at,
            })
            .from(job_listings)
            .where(and(eq(job_listings.organization, orgId), isNotNull(job_listings.deleted_at)))
            .orderBy(desc(job_listings.deleted_at)),
        db
            .select({
                id: candidates.id,
                name: candidates.name,
                email: candidates.email,
                status: candidates.status,
                deleted_at: candidates.deleted_at,
                created_at: candidates.created_at,
            })
            .from(candidates)
            .where(and(eq(candidates.organization, orgId), isNotNull(candidates.deleted_at)))
            .orderBy(desc(candidates.deleted_at)),
        db
            .select({
                id: applications.id,
                deleted_at: applications.deleted_at,
                created_at: applications.created_at,
                candidate_name: candidates.name,
                candidate_email: candidates.email,
                job_name: job_listings.name,
            })
            .from(applications)
            // The joined job/candidate may themselves be trashed — their
            // names are still shown, so no deleted_at filter on the joins.
            .leftJoin(candidates, eq(candidates.id, applications.candidate))
            .leftJoin(job_listings, eq(job_listings.id, applications.job_id))
            .where(and(eq(applications.organization, orgId), isNotNull(applications.deleted_at)))
            .orderBy(desc(applications.deleted_at)),
    ]);

    return {
        jobs: jobs.map((row) => ({
            type: "job" as const,
            id: row.id,
            title: row.name,
            subtitle: [row.location, row.status].filter(Boolean).join(" • "),
            deletedAt: row.deleted_at!,
            createdAt: row.created_at,
        })),
        candidates: candidateRows.map((row) => ({
            type: "candidate" as const,
            id: row.id,
            title: row.name,
            subtitle: [row.email, row.status].filter(Boolean).join(" • "),
            deletedAt: row.deleted_at!,
            createdAt: row.created_at,
        })),
        applications: applicationRows.map((row) => ({
            type: "application" as const,
            id: row.id,
            title: row.candidate_name
                ? `${row.candidate_name}${row.job_name ? ` — ${row.job_name}` : ""}`
                : `Application #${row.id}`,
            subtitle: [row.candidate_email, row.job_name].filter(Boolean).join(" • "),
            deletedAt: row.deleted_at!,
            createdAt: row.created_at,
        })),
    };
};

export type TrashCounts = { jobs: number; candidates: number; applications: number };

export const get_trash_counts_db = async (orgId: string): Promise<TrashCounts> => {
    const [jobs, candidateRows, applicationRows] = await Promise.all([
        db
            .select({ id: job_listings.id })
            .from(job_listings)
            .where(and(eq(job_listings.organization, orgId), isNotNull(job_listings.deleted_at))),
        db
            .select({ id: candidates.id })
            .from(candidates)
            .where(and(eq(candidates.organization, orgId), isNotNull(candidates.deleted_at))),
        db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.organization, orgId), isNotNull(applications.deleted_at))),
    ]);
    return { jobs: jobs.length, candidates: candidateRows.length, applications: applicationRows.length };
};

// ── Restore ─────────────────────────────────────────────────────────────────
// A restore clears deleted_at on the row, plus the linked rows its own
// delete cascaded — identified by the shared deleted_at timestamp the
// soft-delete wrote (see delete_candidate / delete_job_listing). Rows the
// user trashed individually first keep their own earlier timestamp and
// stay in Trash.
//
// Invariant kept: a live application always has a live job and a live
// candidate. So restoring a job only restores applications whose candidate
// is still live, restoring a candidate only restores applications whose
// job is still live, and restoring a single application is refused while
// its job or candidate is still trashed (restore that first).
//
// Timestamp caveat: MySQL timestamp columns store second precision, so
// two unrelated deletes landing in the same second share a timestamp and
// a restore can bring back an application trashed individually in that
// same second. Rare, and the row is still restorable — never lost.

type RestoreResult =
    | { success: true; restoredApplications: number; skippedApplications: number }
    | { success: false; message: string };

const restore_cascaded_applications = async (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    where: { jobId?: number; candidateId?: number },
    deletedAt: Date,
    // Returns the ids of the linked rows that must still be live for the
    // application to come back (candidate ids for a job restore, job ids
    // for a candidate restore).
    liveCheck: (applicationIds: number[]) => Promise<Set<number>>,
) => {
    const apps = await tx
        .select({ id: applications.id, candidate: applications.candidate, job_id: applications.job_id })
        .from(applications)
        .where(
            and(
                eq(applications.deleted_at, deletedAt),
                ...(where.jobId !== undefined ? [eq(applications.job_id, where.jobId)] : []),
                ...(where.candidateId !== undefined ? [eq(applications.candidate, where.candidateId)] : []),
            ),
        );
    if (apps.length === 0) return { restored: 0, skipped: 0 };

    const linkedIds = new Set(
        apps
            .map((app) => (where.jobId !== undefined ? app.candidate : app.job_id))
            .filter((id): id is number => id !== null),
    );
    const liveIds = await liveCheck([...linkedIds]);
    const restorable = apps.filter((app) => {
        const linked = where.jobId !== undefined ? app.candidate : app.job_id;
        // No linked row (shouldn't happen) — nothing blocks the restore.
        return linked === null || liveIds.has(linked);
    });
    if (restorable.length > 0) {
        await tx
            .update(applications)
            .set({ deleted_at: null })
            .where(inArray(applications.id, restorable.map((app) => app.id)));
    }
    return { restored: restorable.length, skipped: apps.length - restorable.length };
};

export const restore_job_db = async (jobId: number, orgId: string): Promise<RestoreResult> => {
    const [job] = await db
        .select({ id: job_listings.id, name: job_listings.name, deleted_at: job_listings.deleted_at })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId), isNotNull(job_listings.deleted_at)))
        .limit(1);
    if (!job || !job.deleted_at) {
        return { success: false, message: "Job not found in Trash" };
    }

    const { restored, skipped } = await db.transaction(async (tx) => {
        const result = await restore_cascaded_applications(
            tx,
            { jobId },
            job.deleted_at!,
            async (candidateIds) => {
                if (candidateIds.length === 0) return new Set<number>();
                const live = await tx
                    .select({ id: candidates.id })
                    .from(candidates)
                    .where(and(inArray(candidates.id, candidateIds), isNull(candidates.deleted_at)));
                return new Set(live.map((row) => row.id));
            },
        );
        await tx
            .update(job_listings)
            .set({ deleted_at: null })
            .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)));
        return result;
    });

    revalidateTrash(orgId);
    return { success: true, restoredApplications: restored, skippedApplications: skipped };
};

export const restore_candidate_db = async (candidateId: number, orgId: string): Promise<RestoreResult> => {
    const [candidate] = await db
        .select({ id: candidates.id, name: candidates.name, deleted_at: candidates.deleted_at })
        .from(candidates)
        .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId), isNotNull(candidates.deleted_at)))
        .limit(1);
    if (!candidate || !candidate.deleted_at) {
        return { success: false, message: "Candidate not found in Trash" };
    }

    const { restored, skipped } = await db.transaction(async (tx) => {
        const result = await restore_cascaded_applications(
            tx,
            { candidateId },
            candidate.deleted_at!,
            async (jobIds) => {
                if (jobIds.length === 0) return new Set<number>();
                const live = await tx
                    .select({ id: job_listings.id })
                    .from(job_listings)
                    .where(and(inArray(job_listings.id, jobIds), isNull(job_listings.deleted_at)));
                return new Set(live.map((row) => row.id));
            },
        );
        await tx
            .update(candidates)
            .set({ deleted_at: null })
            .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId)));
        return result;
    });

    revalidateTrash(orgId);
    return { success: true, restoredApplications: restored, skippedApplications: skipped };
};

export const restore_application_db = async (applicationId: number, orgId: string): Promise<RestoreResult> => {
    const [application] = await db
        .select({
            id: applications.id,
            job_id: applications.job_id,
            candidate: applications.candidate,
            deleted_at: applications.deleted_at,
        })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNotNull(applications.deleted_at)))
        .limit(1);
    if (!application || !application.deleted_at) {
        return { success: false, message: "Application not found in Trash" };
    }

    // A live application needs a live job and candidate — refuse while
    // either is still trashed instead of restoring into a broken state.
    if (application.job_id !== null) {
        const [job] = await db
            .select({ id: job_listings.id })
            .from(job_listings)
            .where(and(eq(job_listings.id, application.job_id), isNull(job_listings.deleted_at)))
            .limit(1);
        if (!job) {
            return { success: false, message: "This application's job is still in Trash — restore the job first" };
        }
    }
    if (application.candidate !== null) {
        const [candidate] = await db
            .select({ id: candidates.id })
            .from(candidates)
            .where(and(eq(candidates.id, application.candidate), isNull(candidates.deleted_at)))
            .limit(1);
        if (!candidate) {
            return { success: false, message: "This application's candidate is still in Trash — restore the candidate first" };
        }
    }

    await db
        .update(applications)
        .set({ deleted_at: null })
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)));

    revalidateTrash(orgId);
    return { success: true, restoredApplications: 0, skippedApplications: 0 };
};
