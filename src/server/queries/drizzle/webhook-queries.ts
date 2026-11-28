// ─────────────────────────────────────────────────────────────────────────────
// Outbound-webhook DB queries (worker-safe: no Clerk, no server-only
// imports — the BullMQ worker imports the delivery helpers). Every query
// is org-scoped: a subscription/delivery row is only ever read or written
// for the org that owns it, and subscription ids are always checked
// against the session org (the actions pass orgId from auth()).
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@/drizzle/db";
import { and, desc, eq } from "drizzle-orm";
import {
    applications,
    candidates,
    interviews,
    job_listings,
    stages,
    webhook_deliveries,
    webhook_subscriptions,
} from "@/drizzle/schema";
import type { WebhookEventData, WebhookEventType } from "@/lib/webhooks/events";

// ── Subscriptions ───────────────────────────────────────────────────────────

export type WebhookSubscriptionRow = typeof webhook_subscriptions.$inferSelect;

export type WebhookDeliveryRow = typeof webhook_deliveries.$inferSelect;

/** Active subscriptions for one org subscribed to `event`. The delivery
 *  worker calls this per event; the list is re-read on every event, so a
 *  create/delete takes effect without a restart. */
export async function db_get_active_webhook_subscriptions(
    orgId: string,
    event: WebhookEventType,
): Promise<WebhookSubscriptionRow[]> {
    const rows = await db
        .select()
        .from(webhook_subscriptions)
        .where(
            and(
                eq(webhook_subscriptions.organization, orgId),
                eq(webhook_subscriptions.active, true),
            ),
        );
    // `events` is a JSON array — filter in code (MySQL JSON_CONTAINS
    // would work, but the per-org row count is tiny and this keeps the
    // query portable across the app's MySQL setups).
    return rows.filter((row) => (row.events ?? []).includes(event));
}

export async function db_list_webhook_subscriptions(
    orgId: string,
): Promise<WebhookSubscriptionRow[]> {
    return db
        .select()
        .from(webhook_subscriptions)
        .where(eq(webhook_subscriptions.organization, orgId))
        .orderBy(desc(webhook_subscriptions.created_at));
}

/** One subscription, org-checked. Returns null for a missing id OR an id
 *  belonging to another org (callers must not be able to tell which). */
export async function db_get_webhook_subscription(
    orgId: string,
    subscriptionId: number,
): Promise<WebhookSubscriptionRow | null> {
    const [row] = await db
        .select()
        .from(webhook_subscriptions)
        .where(
            and(
                eq(webhook_subscriptions.id, subscriptionId),
                eq(webhook_subscriptions.organization, orgId),
            ),
        )
        .limit(1);
    return row ?? null;
}

export async function db_create_webhook_subscription(args: {
    orgId: string;
    url: string;
    events: WebhookEventType[];
    /** Already AES-256-GCM encrypted (encrypt_plugin_secret) — the
     *  plaintext secret is NEVER passed to this module. */
    encryptedSigningSecret: string;
    createdBy: string | null;
}): Promise<WebhookSubscriptionRow> {
    const [row] = await db
        .insert(webhook_subscriptions)
        .values({
            organization: args.orgId,
            url: args.url,
            events: args.events,
            signing_secret: args.encryptedSigningSecret,
            active: true,
            created_by: args.createdBy,
        })
        .$returningId();
    if (!row) throw new Error("Failed to create webhook subscription");
    const created = await db_get_webhook_subscription(args.orgId, row.id);
    if (!created) throw new Error("Failed to read back webhook subscription");
    return created;
}

export async function db_delete_webhook_subscription(
    orgId: string,
    subscriptionId: number,
): Promise<boolean> {
    const result = await db
        .delete(webhook_subscriptions)
        .where(
            and(
                eq(webhook_subscriptions.id, subscriptionId),
                eq(webhook_subscriptions.organization, orgId),
            ),
        );
    // Delivery rows cascade (FK onDelete cascade); a delete that matched
    // nothing is a no-op, not an error.
    return (result[0]?.affectedRows ?? 0) > 0;
}

// ── Deliveries (the log) ────────────────────────────────────────────────────

/** Recent delivery attempts for one org, newest first. `subscriptionId`
 *  narrows to one subscription's log. */
export async function db_list_webhook_deliveries(
    orgId: string,
    opts?: { subscriptionId?: number; limit?: number },
): Promise<WebhookDeliveryRow[]> {
    const conditions = [eq(webhook_deliveries.organization, orgId)];
    if (opts?.subscriptionId) {
        conditions.push(eq(webhook_deliveries.subscription_id, opts.subscriptionId));
    }
    return db
        .select()
        .from(webhook_deliveries)
        .where(and(...conditions))
        .orderBy(desc(webhook_deliveries.created_at))
        .limit(opts?.limit ?? 50);
}

export async function db_insert_webhook_delivery_attempt(args: {
    deliveryId: string;
    subscriptionId: number;
    orgId: string;
    event: WebhookEventType;
    eventId: string;
    attempt: number;
    status: "delivered" | "failed" | "error";
    statusCode: number | null;
    responseSnippet: string | null;
    errorMessage: string | null;
    durationMs: number | null;
}): Promise<number> {
    const [row] = await db
        .insert(webhook_deliveries)
        .values({
            delivery_id: args.deliveryId,
            subscription_id: args.subscriptionId,
            organization: args.orgId,
            event: args.event,
            event_id: args.eventId,
            attempt: args.attempt,
            status: args.status,
            status_code: args.statusCode,
            response_snippet: args.responseSnippet,
            error_message: args.errorMessage,
            duration_ms: args.durationMs,
        })
        .$returningId();
    if (!row) throw new Error("Failed to record webhook delivery attempt");
    return row.id;
}

// ── Payload resolvers (real facts, resolved at the firing site) ─────────────

/**
 * `stage_changed` data for one application move. Resolves candidate /
 * job / stage names from the DB (org-scoped at every join) — the move
 * action only knows ids. Returns null when the application (or its job)
 * cannot be resolved for this org, in which case the caller skips the
 * webhook: the move already succeeded, and a webhook must never block it
 * or invent facts.
 */
export async function db_resolve_stage_changed_payload(
    orgId: string,
    applicationId: number,
    fromStageId: number | null,
    toStageId: number,
): Promise<Extract<
    WebhookEventData,
    { from_stage: string | null }
> | null> {
    const [application] = await db
        .select({
            id: applications.id,
            job_id: applications.job_id,
            candidate_id: applications.candidate,
        })
        .from(applications)
        .where(
            and(
                eq(applications.id, applicationId),
                eq(applications.organization, orgId),
            ),
        )
        .limit(1);
    if (!application) return null;

    const [candidate] = application.candidate_id
        ? await db
              .select({ id: candidates.id, name: candidates.name, email: candidates.email })
              .from(candidates)
              .where(
                  and(
                      eq(candidates.id, application.candidate_id),
                      eq(candidates.organization, orgId),
                  ),
              )
              .limit(1)
        : [undefined];

    const [job] = application.job_id
        ? await db
              .select({ id: job_listings.id, name: job_listings.name })
              .from(job_listings)
              .where(
                  and(
                      eq(job_listings.id, application.job_id),
                      eq(job_listings.organization, orgId),
                  ),
              )
              .limit(1)
        : [undefined];

    const stageName = async (stageId: number | null): Promise<string | null> => {
        if (!stageId) return null;
        const [stage] = await db
            .select({ name: stages.stage_name })
            .from(stages)
            .where(eq(stages.id, stageId))
            .limit(1);
        return stage?.name ?? null;
    };

    return {
        candidate: {
            id: String(application.candidate_id ?? ""),
            name: candidate?.name ?? null,
            email: candidate?.email ?? null,
        },
        job: { id: job?.id ?? null, name: job?.name ?? null },
        application: { id: application.id },
        from_stage: await stageName(fromStageId),
        to_stage: await stageName(toStageId),
    };
}

/**
 * Interview-event data for one interview row. Used by the schedule /
 * reschedule / cancel firing sites. Returns null when the interview
 * cannot be resolved for this org.
 */
export async function db_resolve_interview_payload(
    orgId: string,
    interviewId: number,
): Promise<Extract<
    WebhookEventData,
    { interview: { id: number } }
> | null> {
    const [row] = await db
        .select({
            interview_id: interviews.id,
            application_id: interviews.applications_id,
            start_at: interviews.start_at,
            end_at: interviews.end_at,
            type: interviews.type,
            location: interviews.locations,
            link: interviews.link,
            status: interviews.status,
            cancel_reason: interviews.cancel_reason,
            candidate_id: candidates.id,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            job_id: job_listings.id,
            job_name: job_listings.name,
        })
        .from(interviews)
        .leftJoin(applications, eq(applications.id, interviews.applications_id))
        .leftJoin(candidates, eq(candidates.id, applications.candidate))
        .leftJoin(job_listings, eq(job_listings.id, applications.job_id))
        .where(
            and(
                eq(interviews.id, interviewId),
                eq(interviews.organization, orgId),
            ),
        )
        .limit(1);
    if (!row) return null;

    const toIso = (d: Date | null): string | null =>
        d instanceof Date ? d.toISOString() : null;

    return {
        candidate: {
            id: row.candidate_id ?? null,
            name: row.candidate_name ?? null,
            email: row.candidate_email ?? null,
        },
        job: { id: row.job_id ?? null, name: row.job_name ?? null },
        application: { id: row.application_id ?? null },
        interview: {
            id: row.interview_id,
            start_at: toIso(row.start_at),
            end_at: toIso(row.end_at),
            type: row.type,
            location: row.location,
            link: row.link,
            status: row.status,
            cancel_reason: row.cancel_reason,
        },
    };
}
