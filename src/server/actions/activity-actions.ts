'use server';

import { z } from "zod";
import { requirePermission } from "@/server/permissions";
import { get_activity_log } from "@/server/queries/drizzle/activity";

const pageSchema = z.object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
});

/**
 * Read the session org's activity log, newest first.
 *
 * Gated on `job:view` — an existing view permission held by every org
 * role (admin, recruiter, hiring_manager, member), so the feed is visible
 * to any org member and to no one outside the org. No new permission was
 * added for this. The query itself is org-scoped on top of the gate.
 */
export const get_activity_log_action = async (
    unsafeData?: z.infer<typeof pageSchema>,
) => {
    const { orgId } = await requirePermission("job:view");
    const parsed = pageSchema.safeParse(unsafeData ?? {});
    const { limit, offset } = parsed.success
        ? parsed.data
        : { limit: 20, offset: 0 };
    return await get_activity_log(orgId, { limit, offset });
};
