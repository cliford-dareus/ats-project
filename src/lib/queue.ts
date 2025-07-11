import { Queue, Worker } from 'bullmq';
import redis from './redis';
import Trigger from "@/models/trigger";

// Create a queue instance
export const taskQueue = new Queue('taskQueue', {
    connection: redis,
});

// Worker to process tasks
export const taskWorker = new Worker(
    'taskQueue',
    async (job) => {
        console.log(`Processing job ${job.id}:`, job.data);
        // Simulate task execution (e.g., update DB or send email)
        // Add your business logic here.
        switch (job.data.type) {
            case 'message':
                // Simulate task execution
                // await simulateTaskExecution(job.data);
                console.log(job.data.config)
                await Trigger.deleteOne({_id: job.data.trigger_id});
                break;
            case 'note':
                // Simulate task execution
                // await simulateTaskExecution(job.data);
                console.log(job.data.config)
                await Trigger.deleteOne({_id: job.data.trigger_id});
                break;
            default:
                console.error(`Unknown job type: ${job.data}`);
        }
    },
    { connection: redis }
);

// Log worker events for debugging
taskWorker.on('completed', (job) => console.log(`Job ${job.id} completed`));
taskWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));
