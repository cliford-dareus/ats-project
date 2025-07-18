import { Queue, Worker } from 'bullmq';
import redis from './redis';
import Trigger from "@/models/trigger";
import { update_application_stage_action } from '@/server/actions/application_actions';
import { applications, stages } from '@/drizzle/schema';
import { db } from '@/drizzle/db';
import { eq } from 'drizzle-orm';
import { CACHE_TAGS, revalidateDbCache } from './cache';
import mongodb from "@/lib/mongodb";

// Create a queue instance
export const taskQueue = new Queue('taskQueue', {
    connection: redis,
});

// Worker to process tasks
export const taskWorker = new Worker(
    'taskQueue',
    async (job) => {
        await mongodb();
        console.log(`Processing job ${job.id}:`, job.data);

        switch (job.data.type) {
            case 'move':
                if (job.data.config.condition.type && job.data.config.condition.type === 'location') {
                    console.log(job.data.config.condition.location);

                    const result = await db.select().from(applications).where(eq(applications.id, job.data.application_id))
                    const application = Array.isArray(result) ? result[0] : null;
                    if (!application) return;

                    // Get the application stage id from the stage name
                    const stage = await db.select()
                        .from(stages)
                        .where(eq(stages.job_id, application.job_id!));
                    const stageId = stage.find((s) => s.stage_name === job.data.config.condition.target)?.id;

                    await db
                            .update(applications)
                            .set({ current_stage_id: stageId })
                            .where(eq(applications.id, application.id!));

                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/triggers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ jobId: application.job_id }),
                        });
                    } catch (error) {
                        console.error('Cache revalidation failed:', error);
                    }
                };

                if (job.data.config.condition.type && job.data.config.condition.type === 'experience') {
                    // Update application experience
                    console.log(job.data.config.condition.experience)
                };

                if (job.data.config.condition.type && job.data.config.condition.type === 'score') {
                    // Update application score
                    console.log(job.data.config.condition.score)
                };

                // revalidateDbCache({
                //     tag: CACHE_TAGS.applications,
                // });

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
    { connection: redis }
);

// Log worker events for debugging
taskWorker.on('completed', (job) => console.log(`Job ${job.id} completed`));
taskWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));
