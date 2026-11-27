import {TriggerJobData, taskQueue} from "@/lib/queue";

/** Short stable hash (djb2) — keeps long file URLs out of the dedup key. */
function shortHash(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
}

/**
 * Dedup key for the double-submit guard. Includes the application id and
 * a per-event discriminator, which the old `jobId` key lacked: a re-apply
 * (new application) or a second stage move for the same candidate+job
 * is a different event and must not be dropped.
 */
function dedupId(data: TriggerJobData): string {
    const { event, context } = data;
    const candidateId = "candidateId" in event ? event.candidateId : "";
    const applicationId =
        event.applicationId ??
        (context.settings?.applicationId as number | string | undefined) ??
        "";
    let discriminator = "";
    if (event.type === "stage_changed") discriminator = event.toStage;
    else if (event.type === "resume_uploaded") discriminator = shortHash(event.fileUrl);
    return `${event.type}:${context.job?.job_id ?? ""}:${candidateId}:${applicationId}:${discriminator}`;
}

export async function enqueueTrigger(data: TriggerJobData): Promise<string> {
    const job = await taskQueue.add(
        data.event.type,   // job name — shows in Bull Board dashboard
        data,
        {
            // BullMQ `deduplication` (installed bullmq 5.41.8 supports the
            // `deduplication` add-option): a double-submit within 60s
            // returns the in-flight job instead of firing twice. Unlike
            // the old permanent `jobId` key, the TTL frees the key once
            // the window passes, so a re-apply or a second stage move is
            // never silently dropped forever.
            deduplication: { id: dedupId(data), ttl: 60_000 },
        },
    );

    console.log(`[Queue] Enqueued ${data.event.type} as job ${job.id}`);
    return job.id!;
}
