"use server";

// ─────────────────────────────────────────────────────────────────────────────
// Outbound-webhook server actions (feat/plugin-webhooks).
//
// Org-level infrastructure, NOT a plugin-manifest provider — see
// src/drizzle/schema.ts (webhook_subscriptions). Every action:
//   • takes the org from the Clerk session (requirePermission returns it)
//     — a client-supplied orgId is never accepted;
//   • requires `plugin:manage` (the same gate as the plugin settings this
//     surface sits next to; only org:admin holds it today);
//   • never returns a signing secret except once, in the create response.
//     List responses carry a masked secret (•••• + last 4) for display.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";
import { requirePermission } from "@/server/permissions";
import {
    encrypt_plugin_secret,
    mask_plugin_secret,
} from "@/lib/plugin-encryption";
import { generate_webhook_signing_secret } from "@/lib/webhooks/signing";
import { is_deliverable_webhook_url } from "@/lib/webhooks/deliver";
import {
    is_webhook_event,
    type WebhookEventType,
} from "@/lib/webhooks/events";
import {
    db_create_webhook_subscription,
    db_delete_webhook_subscription,
    db_list_webhook_deliveries,
    db_list_webhook_subscriptions,
    type WebhookDeliveryRow,
    type WebhookSubscriptionRow,
} from "@/server/queries/drizzle/webhook-queries";

const CreateSubscriptionSchema = z.object({
    url: z
        .string()
        .trim()
        .min(1, "A destination URL is required")
        .max(2048, "URL is too long")
        .refine(
            (url) => {
                try {
                    return new URL(url).protocol === "https:";
                } catch {
                    return false;
                }
            },
            { message: "Destination URL must be an https URL" },
        ),
    events: z
        .array(z.string())
        .min(1, "Subscribe to at least one event")
        .refine(
            (events): events is WebhookEventType[] =>
                events.every((event) => is_webhook_event(event)),
            { message: "Unknown event type" },
        ),
});

export type WebhookSubscriptionView = Omit<
    WebhookSubscriptionRow,
    "signing_secret"
> & {
    /** Masked for display (•••• + last 4). Never the secret itself. */
    signing_secret_masked: string;
};

export type WebhookDeliveryView = WebhookDeliveryRow & {
    /** Destination host, for the log table (the full URL stays with the
     *  subscription row — the log shows where the attempt went). */
    destination_host: string | null;
};

const toSubscriptionView = (
    row: WebhookSubscriptionRow,
): WebhookSubscriptionView => {
    const { signing_secret: _secret, ...rest } = row;
    void _secret;
    return {
        ...rest,
        signing_secret_masked: mask_plugin_secret(row.signing_secret),
    };
};

const toDeliveryView = (
    row: WebhookDeliveryRow,
    hosts: Map<number, string | null>,
): WebhookDeliveryView => ({
    ...row,
    destination_host: hosts.get(row.subscription_id) ?? null,
});

type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

/** List the org's subscriptions (masked secrets) + recent deliveries. */
export async function list_webhook_subscriptions_action(): Promise<
    ActionResult<{
        subscriptions: WebhookSubscriptionView[];
        deliveries: WebhookDeliveryView[];
    }>
> {
    try {
        const { orgId } = await requirePermission("plugin:manage");
        const [subscriptions, deliveries] = await Promise.all([
            db_list_webhook_subscriptions(orgId),
            db_list_webhook_deliveries(orgId, { limit: 50 }),
        ]);
        const hosts = new Map(
            subscriptions.map((s) => {
                let host: string | null = null;
                try {
                    host = new URL(s.url).hostname;
                } catch {
                    host = null;
                }
                return [s.id, host] as const;
            }),
        );
        return {
            ok: true,
            data: {
                subscriptions: subscriptions.map(toSubscriptionView),
                deliveries: deliveries.map((row) => toDeliveryView(row, hosts)),
            },
        };
    } catch (err) {
        console.error("[webhooks] Failed to list subscriptions:", err);
        return { ok: false, error: "Could not load webhook subscriptions" };
    }
}

/**
 * Create a subscription. The signing secret is generated server-side,
 * encrypted before storage, and returned in plaintext EXACTLY ONCE —
 * the UI shows it once and tells the org to copy it now; it is never
 * returned or logged again. (No rotation endpoint yet: rotate by
 * deleting the subscription and creating a new one.)
 */
export async function create_webhook_subscription_action(
    unsafeInput: unknown,
): Promise<
    ActionResult<{
        subscription: WebhookSubscriptionView;
        /** Plaintext signing secret — shown once, never stored or logged. */
        signing_secret: string;
    }>
> {
    try {
        const { orgId, userId } = await requirePermission("plugin:manage");
        const parsed = CreateSubscriptionSchema.safeParse(unsafeInput);
        if (!parsed.success) {
            return {
                ok: false,
                error:
                    parsed.error.issues[0]?.message ?? "Invalid subscription",
            };
        }
        const { url, events } = parsed.data;

        if (!is_deliverable_webhook_url(url)) {
            return {
                ok: false,
                error:
                    "Destination URL must be an https URL (localhost is not allowed).",
            };
        }

        const signingSecret = generate_webhook_signing_secret();
        // Throws when PLUGIN_ENCRYPTION_KEY is missing/malformed — the
        // save fails loudly instead of storing a plaintext secret.
        const encrypted = encrypt_plugin_secret(signingSecret);

        const row = await db_create_webhook_subscription({
            orgId,
            url,
            events,
            encryptedSigningSecret: encrypted,
            createdBy: userId,
        });

        return {
            ok: true,
            data: {
                subscription: toSubscriptionView(row),
                signing_secret: signingSecret,
            },
        };
    } catch (err) {
        console.error("[webhooks] Failed to create subscription:", err);
        return { ok: false, error: "Could not create webhook subscription" };
    }
}

/** Delete a subscription (its delivery rows cascade). */
export async function delete_webhook_subscription_action(
    subscriptionId: number,
): Promise<ActionResult<{ deleted: boolean }>> {
    try {
        const { orgId } = await requirePermission("plugin:manage");
        if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
            return { ok: false, error: "Invalid subscription" };
        }
        const deleted = await db_delete_webhook_subscription(orgId, subscriptionId);
        if (!deleted) {
            return { ok: false, error: "Subscription not found" };
        }
        return { ok: true, data: { deleted: true } };
    } catch (err) {
        console.error("[webhooks] Failed to delete subscription:", err);
        return { ok: false, error: "Could not delete webhook subscription" };
    }
}

/** Recent delivery attempts, optionally for one subscription. */
export async function list_webhook_deliveries_action(
    subscriptionId?: number,
): Promise<ActionResult<{ deliveries: WebhookDeliveryView[] }>> {
    try {
        const { orgId } = await requirePermission("plugin:manage");
        const [deliveries, subscriptions] = await Promise.all([
            db_list_webhook_deliveries(orgId, {
                subscriptionId,
                limit: 100,
            }),
            db_list_webhook_subscriptions(orgId),
        ]);
        const hosts = new Map(
            subscriptions.map((s) => {
                let host: string | null = null;
                try {
                    host = new URL(s.url).hostname;
                } catch {
                    host = null;
                }
                return [s.id, host] as const;
            }),
        );
        return {
            ok: true,
            data: {
                deliveries: deliveries.map((row) => toDeliveryView(row, hosts)),
            },
        };
    } catch (err) {
        console.error("[webhooks] Failed to list deliveries:", err);
        return { ok: false, error: "Could not load delivery log" };
    }
}
