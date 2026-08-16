import {TriggerJobData, taskQueue} from "@/lib/queue";

export async function enqueueTrigger(data: TriggerJobData): Promise<string> {
    const job = await taskQueue.add(
        data.event.type,   // job name — shows in Bull Board dashboard
        data,
        {
            // Deduplicate: don't fire the same event twice for the same candidate
            // if the user double-submits
            jobId: `${data.event.type}:${data.context.job?.job_id}:${"candidateId" in data.event ? data.event.candidateId : ""}`,
        },
    );

    console.log(`[Queue] Enqueued ${data.event.type} as job ${job.id}`);
    return job.id!;
}