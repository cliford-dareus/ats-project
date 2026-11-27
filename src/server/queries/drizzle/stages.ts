
import {db} from "@/drizzle/db";
import {stages} from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getGlobalTag } from "@/lib/cache";
import { and, eq, sql } from "drizzle-orm";
import { JOB_STAGES } from "@/zod";

export const get_stage_by_name = async (stageName: typeof JOB_STAGES._type) => {
  const cacheFn = dbCache(get_applications_stages_db, {
    tags: [getGlobalTag(CACHE_TAGS.stages)],
  });

  return cacheFn(stageName);
};

export const get_applications_stages_db = async (stageName: typeof JOB_STAGES._type) => {
    return await db.select().from(stages).where(eq(stages.stage_name, stageName));
};

// ── Create one stage for a job (B13) ─────────────────────────────────────────
// Appends after the last stage so the pipeline order is stable. Callers must
// have asserted the job belongs to the session org and deduped the name
// (there is also a unique (job_id, stage_name) index as a backstop).
export const create_stage_for_job = async ({
    jobId,
    stageName,
    color,
    assignTo,
    needSchedule,
}: {
    jobId: number;
    stageName: typeof JOB_STAGES._type;
    color: string;
    assignTo: string;
    needSchedule: boolean;
}) => {
    const [last] = await db
        .select({ maxOrder: sql<number | null>`max(${stages.stage_order_id})` })
        .from(stages)
        .where(eq(stages.job_id, jobId));
    await db.insert(stages).values({
        job_id: jobId,
        stage_name: stageName,
        stage_order_id: (last?.maxOrder ?? -1) + 1,
        color,
        assign_to: assignTo,
        need_schedule: needSchedule,
    });
};

// ── Job-scoped stage lookup (S-1) ─────────────────────────────────────────────
// The unscoped get_stage_by_name above selects by name alone across every
// job/org, so a stage-move could land on an arbitrary stage from another
// job. Stage moves must resolve the stage within the application's own job:
// same name, same job_id, at most one row.
export const get_stage_by_name_for_job = async (
    stageName: typeof JOB_STAGES._type,
    jobId: number,
) => {
    const [stage] = await db
        .select()
        .from(stages)
        .where(and(eq(stages.stage_name, stageName), eq(stages.job_id, jobId)))
        .limit(1);
    return stage ?? null;
};

