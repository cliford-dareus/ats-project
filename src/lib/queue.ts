import { Queue } from 'bullmq';
import redis from './redis';
import {ATSContext, TriggerEvent} from "@/types";
import type { ConfigType } from "@/plugins/smart-trigger/types";

export interface TriggerJobData {
    event:   TriggerEvent;
    context: ATSContext & { subdomain: string };
}

// Legacy smart-trigger job payload, enqueued by addTaskToQueue in
// server/queries/mongo/smart-task.ts. It has no `event`/`context` — the
// worker skips these jobs (no processor was ever wired for them), but the
// queue type must admit what is actually enqueued. trigger_id is the Mongo
// ObjectId of the Trigger doc (a hex string after the BullMQ JSON round-trip).
export interface SmartTriggerJobPayload {
    application_id: number;
    trigger_id: unknown;
    jobId: number;
    type: string;
    new_stage_name?: string;
    config: ConfigType;
}

export type QueueJobData = TriggerJobData | SmartTriggerJobPayload;

// Create a queue instance
export const taskQueue = new Queue<QueueJobData>('aplico_queue', {
    connection: redis,
});