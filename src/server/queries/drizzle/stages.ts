
import {db} from "@/drizzle/db";
import {stages, triggers} from "@/drizzle/schema";
import { CACHE_TAGS, dbCache, getGlobalTag } from "@/lib/cache";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { eq } from "drizzle-orm";

export const get_stage_by_name = async (stageName: string) => {
  const cacheFn = dbCache(get_applications_stages_db, {
    tags: [getGlobalTag(CACHE_TAGS.stages)],
  });

  return cacheFn(stageName);
};

export const get_applications_stages_db = async (stageName: string) => {
    return await db.select().from(stages).where(eq(stages.stage_name, stageName));
};

export const add_trigger_to_stage = async (stageId: number, action: TriggerAction) => {
    return await db.insert(triggers).values({
        action_type: action.action_type,
        config: action.config,
        stage_id: stageId,
    });
};
