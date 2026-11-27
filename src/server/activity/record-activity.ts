import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { activity_log, usersTable } from "@/drizzle/schema";

export type ActivityEntityType = 'job' | 'candidate' | 'application' | 'interview';

/**
 * Append one entry to the org's activity / audit log.
 *
 * CROSS-AGENT CONTRACT (Trash agent imports this too): keep the signature
 * exactly as specified — `record_activity({ action, entity_type, entity_id,
 * summary })`. orgId and the actor (userId + display name) always come
 * from the Clerk auth() session — never from client input — so a caller
 * can never log into another org or impersonate another actor.
 *
 * Best-effort by design: this NEVER throws into its caller. Recording is
 * placed after the mutation succeeds, and a logging failure must never
 * fail (or roll back) the user's action — it is caught and logged here.
 */
export async function record_activity(input: {
    action: string;
    entity_type: ActivityEntityType;
    entity_id: number;
    summary: string;
}): Promise<void> {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) return;

        // Display name from users_table; fall back to the Clerk id when the
        // user has no local row (the name is denormalized into the entry).
        const [user] = await db
            .select({ name: usersTable.name })
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        await db.insert(activity_log).values({
            organization_id: orgId,
            actor_id: userId,
            actor_name: user?.name ?? userId,
            action: input.action,
            entity_type: input.entity_type,
            entity_id: input.entity_id,
            summary: input.summary,
        });
    } catch (error) {
        console.error("[activity] Failed to record activity:", error);
    }
}
