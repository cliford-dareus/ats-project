import { Queue } from 'bullmq';
import redis from './redis';
import {ATSContext, TriggerEvent} from "@/types";

export interface TriggerJobData {
    event:   TriggerEvent;
    context: ATSContext & { subdomain: string };
}

// Create a queue instance
export const taskQueue = new Queue<TriggerJobData>('aplico_queue', {
    connection: redis,
});