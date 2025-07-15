
import {db} from "@/drizzle/db";
import {stages, triggers} from "@/drizzle/schema";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import {eq} from "drizzle-orm";

export const add_trigger_to_stage = async (stageId: number, action: TriggerAction) => {
    return await db.insert(triggers).values({
        action_type: action.action_type,
        config: action.config,
        stage_id: stageId,
    });
};
