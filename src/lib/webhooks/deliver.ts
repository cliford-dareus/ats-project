// ─────────────────────────────────────────────────────────────────────────────
// src/lib/webhooks/deliver.ts — the BullMQ worker side of outbound webhooks.
//
// One job = one (event occurrence, subscription). The worker:
//   1. loads the subscription row (org-scoped — a job naming another org's
//      subscription is refused, never delivered),
//   2. decrypts the signing secret server-side (never in the job payload,
//      never logged),
//   3. POSTs the signed JSON payload (10s timeout, https only — see below),
//   4. records one `webhook_deliveries` row for THIS attempt — success or
//      failure — and then throws on non-2xx / transport errors so BullMQ
//      retries with the queue's bounded policy (3 attempts, exponential
//      backoff). A failed delivery is therefore always visible in the log;
//      nothing is ever silently swallowed or faked.
//
// At-least-once: if the POST succeeds but the attempt row fails to write
// (or the worker crashes between the two), the retry redelivers. The
// X-Applico-Delivery-Id header is stable across retries so receivers can
// dedupe.
//
// URL policy (v1, deliberately narrow — DNS-rebinding / private-range
// blocking is a follow-up): the destination must be an https URL whose
// hostname is not localhost/loopback. A subscription that fails this
// check is skipped without a retry — its URL can never deliver, and
// retrying it would only burn the queue.
// ─────────────────────────────────────────────────────────────────────────────
import { decrypt_plugin_secret } from "@/lib/plugin-encryption";
import type { WebhookDeliveryJobData } from "@/lib/queue";
import {
    db_get_webhook_subscription,
    db_insert_webhook_delivery_attempt,
} from "@/server/queries/drizzle/webhook-queries";
import type { WebhookPayload } from "./events";
import {
    WEBHOOK_DELIVERY_ID_HEADER,
    WEBHOOK_EVENT_HEADER,
    WEBHOOK_SIGNATURE_HEADER,
    sign_webhook_payload,
} from "./signing";

const DELIVERY_TIMEOUT_MS = 10_000;
const RESPONSE_SNIPPET_MAX_CHARS = 500;

export type WebhookDeliveryOutcome =
    | { delivered: true; statusCode: number; durationMs: number }
    | { delivered: false; skipped: true; reason: string }
    | { delivered: false; skipped?: false; statusCode: number | null; error: string };

/** True when the URL is deliverable under the v1 policy. */
export const is_deliverable_webhook_url = (rawUrl: string): boolean => {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return false;
    }
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "ip6-localhost") return false;
    if (host === "127.0.0.1" || host === "::1" || host === "[::1]") return false;
    if (host.endsWith(".local") || host.endsWith(".localhost")) return false;
    return true;
};

const truncate = (value: string): string =>
    value.length > RESPONSE_SNIPPET_MAX_CHARS
        ? value.slice(0, RESPONSE_SNIPPET_MAX_CHARS)
        : value;

/**
 * Attempt one delivery. Records the attempt row, then returns the outcome.
 * Throws on delivery failure (non-2xx / transport error) AFTER recording
 * the row, so BullMQ retries — the caller (worker branch) lets the throw
 * propagate. A skipped delivery (bad URL / missing or inactive
 * subscription / undecryptable secret) does NOT throw: retrying it cannot
 * help, and the attempt row (or the log line, when no row can be written)
 * is the record of it.
 */
export async function deliver_webhook_attempt(
    job: WebhookDeliveryJobData["webhookDelivery"],
    attemptNo: number,
): Promise<WebhookDeliveryOutcome> {
    const startedAt = Date.now();
    const durationMs = () => Date.now() - startedAt;

    const record = async (args: {
        status: "delivered" | "failed" | "error";
        statusCode: number | null;
        responseSnippet: string | null;
        errorMessage: string | null;
    }): Promise<void> => {
        try {
            await db_insert_webhook_delivery_attempt({
                deliveryId: job.deliveryId,
                subscriptionId: job.subscriptionId,
                orgId: job.orgId,
                event: job.event,
                eventId: job.eventId,
                attempt: attemptNo,
                status: args.status,
                statusCode: args.statusCode,
                responseSnippet: args.responseSnippet,
                errorMessage: args.errorMessage,
                durationMs: durationMs(),
            });
        } catch (err) {
            // The delivery itself may have succeeded — but without the row
            // the org cannot see it. Log loudly and rethrow so the retry
            // (and the failure) is at least visible in the worker log.
            console.error(
                `[webhooks] Could not record delivery attempt ${job.deliveryId} (subscription ${job.subscriptionId}):`,
                err,
            );
            throw err;
        }
    };

    // ── 1. Load the subscription (org-scoped) ──────────────────────────────
    const subscription = await db_get_webhook_subscription(job.orgId, job.subscriptionId);
    if (!subscription) {
        console.error(
            `[webhooks] Delivery ${job.deliveryId}: subscription ${job.subscriptionId} not found for org ${job.orgId} — skipping (no retry).`,
        );
        return { delivered: false, skipped: true, reason: "Subscription not found for this org" };
    }
    if (!subscription.active) {
        console.log(
            `[webhooks] Delivery ${job.deliveryId}: subscription ${job.subscriptionId} is inactive — skipping (no retry).`,
        );
        return { delivered: false, skipped: true, reason: "Subscription is inactive" };
    }

    // ── 2. URL policy ──────────────────────────────────────────────────────
    if (!is_deliverable_webhook_url(subscription.url)) {
        await record({
            status: "error",
            statusCode: null,
            responseSnippet: null,
            errorMessage:
                "Destination URL is not deliverable: outbound webhooks require an https URL (localhost is not allowed).",
        });
        return { delivered: false, skipped: true, reason: "Destination URL is not deliverable" };
    }

    // ── 3. Decrypt the signing secret ──────────────────────────────────────
    let secret: string;
    try {
        secret = decrypt_plugin_secret(subscription.signing_secret);
    } catch (err) {
        const message =
            "Could not decrypt the subscription's signing secret — it may need to be recreated (e.g. PLUGIN_ENCRYPTION_KEY was rotated without re-encryption).";
        await record({
            status: "error",
            statusCode: null,
            responseSnippet: null,
            errorMessage: message,
        });
        console.error(`[webhooks] Delivery ${job.deliveryId}: ${message}`, err);
        return { delivered: false, skipped: true, reason: message };
    }

    // ── 4. POST the signed payload ─────────────────────────────────────────
    const payload: WebhookPayload = {
        event: job.event,
        event_id: job.eventId,
        occurred_at: job.occurredAt,
        organization_id: job.orgId,
        data: job.data,
    };
    const rawBody = JSON.stringify(payload);
    const signature = sign_webhook_payload(secret, rawBody);

    let response: Response;
    try {
        response = await fetch(subscription.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Applico-Webhooks/1.0",
                [WEBHOOK_EVENT_HEADER]: job.event,
                [WEBHOOK_DELIVERY_ID_HEADER]: job.deliveryId,
                [WEBHOOK_SIGNATURE_HEADER]: signature,
            },
            body: rawBody,
            // Per-attempt timeout — a hung endpoint must not hold a worker
            // slot (concurrency 5) past this.
            signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        });
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Network error while delivering webhook";
        await record({
            status: "error",
            statusCode: null,
            responseSnippet: null,
            errorMessage: message.slice(0, 500),
        });
        console.error(
            `[webhooks] Delivery ${job.deliveryId} attempt ${attemptNo} failed (transport): ${message}`,
        );
        throw new Error(`Webhook delivery failed (transport): ${message}`);
    }

    // ── 5. Record the attempt — then throw on non-2xx so BullMQ retries ───
    let snippet: string | null = null;
    try {
        snippet = truncate(await response.text());
    } catch {
        snippet = null; // body unreadable — the status code is the record
    }

    if (response.ok) {
        await record({
            status: "delivered",
            statusCode: response.status,
            responseSnippet: snippet,
            errorMessage: null,
        });
        return { delivered: true, statusCode: response.status, durationMs: durationMs() };
    }

    await record({
        status: "failed",
        statusCode: response.status,
        responseSnippet: snippet,
        errorMessage: `Destination returned HTTP ${response.status}`,
    });
    console.error(
        `[webhooks] Delivery ${job.deliveryId} attempt ${attemptNo} failed (HTTP ${response.status})`,
    );
    throw new Error(`Webhook delivery failed (HTTP ${response.status})`);
}
