// ─────────────────────────────────────────────────────────────────────────────
// src/lib/webhooks/enqueue.ts — enqueue outbound-webhook deliveries.
//
// Worker-safe (no Clerk, no server-only imports): called from the BullMQ
// worker for queued trigger events AND directly from dashboard server
// actions for events that never reach the queue (stage moves, interview
// schedule/cancel). Both paths converge here so the subscription lookup,
// the per-subscription fan-out, and the idempotency key live in one place.
//
// Delivery semantics: at-least-once, bounded. Each (occurrence,
// subscription) pair becomes one BullMQ job, and the queue's default
// job options apply (3 attempts, exponential backoff 5s/10s/20s — see
// src/lib/queue.ts). The jobId is `webhook:<eventId>:<subscriptionId>`:
// if the same occurrence is enqueued twice (e.g. a retried trigger job
// re-runs the worker handler), BullMQ returns the existing job instead
// of delivering twice. A duplicate-job error is therefore expected, not
// a failure — it is swallowed, everything else is logged and swallowed
// too: enqueueing must never fail the event that triggered it (an
// applicant's apply, a stage move, an interview booking).
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { taskQueue } from "@/lib/queue";
import {
    db_get_active_webhook_subscriptions,
    db_resolve_interview_payload,
    db_resolve_stage_changed_payload,
} from "@/server/queries/drizzle/webhook-queries";
import type { WebhookEventData, WebhookEventType } from "./events";

export interface EnqueueWebhookEventArgs {
    orgId: string;
    event: WebhookEventType;
    /** Per-occurrence id — callers pass a fresh uuid per event. */
    eventId?: string;
    occurredAt?: Date;
    data: WebhookEventData;
}

/** Enqueue one delivery job per active subscription for this event.
 *  Returns the number of jobs enqueued (0 when nobody subscribes).
 *  Never throws. */
export async function enqueue_webhook_deliveries(
    args: EnqueueWebhookEventArgs,
): Promise<number> {
    const eventId = args.eventId ?? randomUUID();
    const occurredAt = args.occurredAt ?? new Date();
    try {
        const subscriptions = await db_get_active_webhook_subscriptions(
            args.orgId,
            args.event,
        );
        if (subscriptions.length === 0) return 0;

        let enqueued = 0;
        for (const subscription of subscriptions) {
            const deliveryId = randomUUID();
            try {
                await taskQueue.add(
                    "webhook_delivery",
                    {
                        webhookDelivery: {
                            deliveryId,
                            subscriptionId: subscription.id,
                            orgId: args.orgId,
                            event: args.event,
                            eventId,
                            occurredAt: occurredAt.toISOString(),
                            data: args.data,
                        },
                    },
                    // Idempotency: the same occurrence must not fan out
                    // twice to the same subscription.
                    { jobId: `webhook:${eventId}:${subscription.id}` },
                );
                enqueued += 1;
            } catch (err) {
                // BullMQ raises when a job with this id already exists
                // (the occurrence was already enqueued) — that is the
                // dedup working, not an error. Anything else is logged;
                // one bad subscription must not block the others.
                const message = err instanceof Error ? err.message : String(err);
                if (/already exists/i.test(message)) continue;
                console.error(
                    `[webhooks] Failed to enqueue delivery for subscription ${subscription.id} (event ${args.event}):`,
                    err,
                );
            }
        }
        if (enqueued > 0) {
            console.log(
                `[webhooks] Enqueued ${enqueued} deliver${enqueued === 1 ? "y" : "ies"} for ${args.event} (org ${args.orgId})`,
            );
        }
        return enqueued;
    } catch (err) {
        // Subscription lookup failed (DB blip) — the event already
        // happened; log and move on. The delivery is lost, and the log
        // says nothing about it: that gap is inherent to enqueue-time
        // fan-out and is why the delivery log only ever claims what it
        // attempted. (A durable outbox table would close it — follow-up.)
        console.error(`[webhooks] Failed to enqueue deliveries for ${args.event}:`, err);
        return 0;
    }
}

// ── Firing-site helpers ─────────────────────────────────────────────────────
// Each resolves the real event facts from the DB (org-scoped) and enqueues.
// All best-effort: they never throw, so a webhook failure can never break
// the stage move / interview booking that triggered it.

/** stage_changed, from moveApplicationAndReorder. */
export async function fire_stage_changed_webhooks(
    orgId: string,
    applicationId: number,
    fromStageId: number | null,
    toStageId: number,
): Promise<void> {
    try {
        const data = await db_resolve_stage_changed_payload(
            orgId,
            applicationId,
            fromStageId,
            toStageId,
        );
        if (!data) return;
        await enqueue_webhook_deliveries({ orgId, event: "stage_changed", data });
    } catch (err) {
        console.error("[webhooks] stage_changed fan-out failed:", err);
    }
}

/** interview_scheduled / interview_cancelled, from the interview actions. */
export async function fire_interview_webhooks(
    orgId: string,
    interviewId: number,
    event: "interview_scheduled" | "interview_cancelled",
): Promise<void> {
    try {
        const data = await db_resolve_interview_payload(orgId, interviewId);
        if (!data) return;
        await enqueue_webhook_deliveries({ orgId, event, data });
    } catch (err) {
        console.error(`[webhooks] ${event} fan-out failed:`, err);
    }
}
