import { Queue, Worker } from 'bullmq';
import redis from './redis';
import { Server as SocketServer } from 'socket.io';
import { executeSmartTriggerAction } from '@/plugins/smart-trigger/_actions';

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

            const { application_id, config } = job.data;
            if (!application_id || !config) throw new Error('Invalid job data: missing applicationId or action');

            try {
                await executeSmartTriggerAction(job.data);
                console.log(`✅ Completed action: ${config.type} for application ${application_id}`);
            } catch (error) {
                console.error(`❌ Failed to execute action ${config.type}:`, error);
                throw error; // Let BullMQ handle retry
            }
        },
        { connection: redis }
    );

    taskWorker.on('completed', (job) => {
        // Emit to specific room (board:${application.job_id})
        const roomId = `board:${job.data.jobId}`;
        io.to(roomId).emit('job-completed', {
            room: `board:${job.data.jobId}`,
            payload: {
                type: job.data.type,
                applicationId: job.data.application_id,
                newStageId: job.data.newStageId,
                message: 'Application moved successfully',
            },
        });
    });

    taskWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));

    return taskWorker;
};
