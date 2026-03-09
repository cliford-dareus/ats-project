import {Queue, Worker} from 'bullmq';
import redis from './redis';
import Trigger from "@/models/trigger";
import {applications, stages} from '@/drizzle/schema';
import {db} from '@/drizzle/db';
import {eq} from 'drizzle-orm';
import { Server as SocketServer } from 'socket.io';

// Create a queue instance
export const taskQueue = new Queue('taskQueue', {
    connection: redis,
});

// Worker to process tasks
export const setupWorker = (io: SocketServer) => {
    const taskWorker = new Worker(
        'taskQueue',
        async (job) => {
            console.log(`Processing job ${job.id}:`, job.data);

            switch (job.data.type) {
                case 'move':
                    if (job.data.config.condition.type && job.data.config.condition.type === 'location') {
                        console.log(job.data.config.condition.location);
                        const result = await db.select().from(applications).where(eq(applications.id, job.data.application_id))
                        const application = Array.isArray(result) ? result[0] : null;
                        if (!application) {
                            console.warn(`Application ${job.data.application_id} not found`);
                            return;
                        };

                        //  Delete Later
                        // Get the application stage id from the stage name
                        const stageResults = await db.select().from(stages).where(eq(stages.job_id, application.job_id!));
                        const stage = stageResults.find((s) => s.stage_name === job.data.config.condition.target);
                        const stageId = stage?.id;
                        if (stageId !== job.data.newStageId) {
                            console.warn(`Target stage ${job.data.config.condition.target} not found`);
                            return;
                        }
                        // =============================

                        await db
                            .update(applications)
                            .set({current_stage_id: stageId})
                            .where(eq(applications.id, application.id!));

                        //  revalidate cache
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate-db-cache`, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({jobId: application.job_id}),
                        });
                    };

                    if (job.data.config.condition.type && job.data.config.condition.type === 'experience') {
                        // Update application experience
                        console.log(job.data.config.condition.experience)
                    };

                    if (job.data.config.condition.type && job.data.config.condition.type === 'score') {
                        // Update application score
                        console.log(job.data.config.condition.score)
                    };

                    await Trigger.deleteOne({_id: job.data.trigger_id});
                    break;
                case 'note':
                    // Simulate task execution
                    // await simulateTaskExecution(job.data);
                    console.log(job.data.config)
                    await Trigger.deleteOne({_id: job.data.trigger_id});
                    break;
                case 'email':
                    // Simulate task execution
                    // await simulateTaskExecution(job.data);
                    console.log(job.data.config)
                    await Trigger.deleteOne({_id: job.data.trigger_id});
                    break;
                default:
                    console.error(`Unknown job type: ${job.data}`);
            }
        },
        {connection: redis}
    );
    // Log worker events for debugging
    taskWorker.on('completed', (job) => {
        // Emit to specific room (board:${application.job_id})
        io.emit('job-completed', {
            room: `board:${job.data.jobId}`,
            payload: {
                type: 'move',
                applicationId: job.data.application_id,
                newStageId: job.data.newStageId,
                message: 'Application moved successfully',
            },
        });
    });
    taskWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));
}
