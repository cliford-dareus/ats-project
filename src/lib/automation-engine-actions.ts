"use server";
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY — Authenticated server-action entry point for the Automation Engine.
//
// This file is the ONLY browser-callable entry point for running automation
// actions. `executeAction` authenticates the caller (Clerk session),
// requires `job:edit`, replaces the caller-supplied org/user with the session
// values, and delegates to `executeActionInternal`, which re-resolves the
// application, candidate and job from the database for the session org.
// Nothing about identity is trusted from the caller.
//
// The BullMQ worker never calls this file — it has no Clerk session and
// calls `executeActionInternal` directly with a queue-verified org.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutomationAction, ATSContext, TriggerEvent } from "@/types";
import { requirePermission } from "@/server/permissions";
import { executeActionInternal } from "./automation-engine-executor";

/**
 * Execute a single automation action (browser/dashboard path).
 *
 * Security: this is a server action, so it is directly invocable from the
 * browser with arbitrary arguments. It therefore (1) authenticates via the
 * Clerk session, (2) requires `job:edit` — the same population that can
 * drag a kanban card (`application:move` is held by exactly the same roles,
 * org:admin and org:recruiter), (3) replaces `context.organization_id` /
 * `context.user_id` with the session org/user, discarding whatever the
 * caller supplied, and (4) delegates to `executeActionInternal`, which
 * re-resolves the application from the DB by id for the session org and
 * loads the candidate and job from the DB — so no action can touch another
 * org's data, and the caller-supplied candidate/job/settings are never
 * trusted for identity. In particular `add_note` now goes through the same
 * resolution, so the candidate is verified to belong to the session org
 * before any note is written.
 */
export async function executeAction(
    action: AutomationAction,
    event: TriggerEvent,
    context: ATSContext,
): Promise<unknown> {
    const session = await requirePermission("job:edit");
    const sessionContext: ATSContext = {
        ...context,
        organization_id: session.orgId,
        user_id: session.userId,
    };
    return executeActionInternal(action, event, sessionContext);
}
