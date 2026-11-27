import { Queue } from 'bullmq';
import redis from './redis';
import {ATSContext, AutomationRule, TriggerEvent} from "@/types";

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

export type QueueJobData = TriggerJobData | DelayedAutomationJobData;

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
