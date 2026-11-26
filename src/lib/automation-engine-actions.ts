"use server";
// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION — Authenticated entry point for automation actions.
//
// This file exports exactly one function, `executeAction`, and it is the
// ONLY automation entry point reachable from the browser (the dashboard
// kanban calls it indirectly via `automationEngine.evaluate`, whose dynamic
// import resolves to this server action). It authenticates the caller,
// requires `job:edit`, and derives the org from the Clerk session — the
// client-supplied org/application/candidate/job in `context` are never
// trusted for identity. All real work lives in
// ./automation-engine-executor.ts (`executeActionInternal`), which is NOT
// a server action and re-resolves the application, candidate, and job from
// the database. The BullMQ worker calls that internal executor directly
// with its queue-verified org; it never goes through this export.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutomationAction, ATSContext, TriggerEvent } from "@/types";
import { requirePermission } from "@/server/permissions";
import { executeActionInternal } from "./automation-engine-executor";

/**
 * Execute a single automation action for the caller's session org.
 * Throws unless the caller is signed in, has an active org, and holds
 * `job:edit` (the same permission that gates the automation rule builder).
 */
export async function executeAction(
    action: AutomationAction,
    event: TriggerEvent,
    context: ATSContext,
): Promise<unknown> {
    const { userId, orgId } = await requirePermission("job:edit");

    // Org and user ALWAYS come from the Clerk session — ignore whatever the
    // caller put in the context. The internal executor re-resolves the
    // application, candidate, and job from the DB for this org.
    const trustedContext: ATSContext = {
        ...context,
        organization_id: orgId,
        user_id: userId,
    };

    return executeActionInternal(action, event, trustedContext);
}
