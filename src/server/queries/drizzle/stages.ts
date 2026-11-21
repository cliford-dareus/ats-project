
import {db} from "@/drizzle/db";
import {stages} from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getGlobalTag } from "@/lib/cache";
import { eq } from "drizzle-orm";
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

