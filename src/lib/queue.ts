import { Queue } from 'bullmq';
import redis from './redis';
import {ATSContext, TriggerEvent} from "@/types";

export interface TriggerJobData {
    event:   TriggerEvent;
    context: ATSContext & { subdomain: string };
}

export type QueueJobData = TriggerJobData;

// Create a queue instance
export const taskQueue = new Queue<QueueJobData>('aplico_queue', {
    connection: redis,
});