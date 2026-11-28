import { Queue } from 'bullmq';
import redis from './redis';
import {ATSContext, AutomationRule, TriggerEvent} from "@/types";
import type { WebhookEventData, WebhookEventType } from "@/lib/webhooks/events";

export interface TriggerJobData {
    event:   TriggerEvent;
    context: ATSContext & { subdomain: string };
}

/**
 * B8 — a durable delayed automation execution: a rule whose delay was
 * scheduled by the worker instead of setTimeout. The worker branch for
 * this payload runs the stored rule action via executeActionInternal.
 * Distinct shape from TriggerJobData (no `event` key) so the worker can
 * tell it apart from legacy smart-trigger jobs.
 */
export interface DelayedAutomationJobData {
    delayedAutomation: {
        executionId: string;
        rule: AutomationRule;
        event: TriggerEvent;
        context: ATSContext & { subdomain: string };
    };
}

/**
 * Outbound-webhook delivery (feat/plugin-webhooks): one BullMQ job per
 * (event occurrence, subscription). The signing secret is NOT in the job
 * payload — the delivery worker loads the subscription row and decrypts
 * it at send time, so secrets never sit in Redis. `deliveryId` groups
 * the attempts of one logical delivery and is sent as the
 * X-Applico-Delivery-Id header so receivers can dedupe an at-least-once
 * redelivery. Distinct shape (no `event` key) so the worker can tell it
 * apart from trigger jobs.
 */
export interface WebhookDeliveryJobData {
    webhookDelivery: {
        deliveryId: string;
        subscriptionId: number;
        orgId: string;
        event: WebhookEventType;
        eventId: string;
        occurredAt: string;
        data: WebhookEventData;
    };
}

export type QueueJobData = TriggerJobData | DelayedAutomationJobData | WebhookDeliveryJobData;

// Create a queue instance
export const taskQueue = new Queue<QueueJobData>('aplico_queue', {
    connection: redis,
    defaultJobOptions: {
        // B1: BullMQ defaults to a single attempt — a transient Redis/DB
        // blip used to kill a trigger job permanently. Retry 3× with
        // exponential backoff (5s, 10s, 20s). There is no dead-letter
        // queue UI yet — surfacing exhausted jobs is a follow-up.
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
    },
});
