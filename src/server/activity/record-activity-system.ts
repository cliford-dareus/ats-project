// ─────────────────────────────────────────────────────────────────────────────
// Worker-safe activity logging.
//
// This module deliberately has NO `import "server-only"` and NO Clerk
// import: the BullMQ worker runs under plain tsx, where `server-only`
// throws at import time, so anything the worker needs must live here —
// not in record-activity.ts (which keeps the marker because
// record_activity() reads the Clerk session). record-activity.ts
// re-exports record_activity_system, so server-side importers see one
// API; the worker imports from THIS file directly.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@/drizzle/db";
import { activity_log } from "@/drizzle/schema";
import type { ActivityEntityType } from "./record-activity";

/**
 * Worker-safe variant of record_activity: the org and the actor are
 * passed in explicitly instead of read from auth(), so it can run in
 * the BullMQ worker (which has no Clerk session). The actor is always
 * the fixed system identity — callers cannot impersonate a user.
 *
 * Best-effort like record_activity: NEVER throws into its caller.
 * NOTE: the `activity_log.entity_type` enum only gains 'plugin' with
 * migration 0013 — until that migration runs, a 'plugin' insert fails
 * at the DB and is dropped here with a console error (the worst case
 * is a missing log entry, never a failed job or mutation).
 */
export async function record_activity_system(input: {
    orgId: string;
    action: string;
    entity_type: ActivityEntityType;
    entity_id: number;
    summary: string;
}): Promise<void> {
    try {
        await db.insert(activity_log).values({
            organization_id: input.orgId,
            actor_id: "system",
            actor_name: "Automation",
            action: input.action,
            entity_type: input.entity_type,
            entity_id: input.entity_id,
            summary: input.summary,
        });
    } catch (error) {
        console.error("[activity] Failed to record system activity:", error);
    }
}
