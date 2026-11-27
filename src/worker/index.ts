import "dotenv/config";
import {Worker, type Job} from "bullmq";
import redis from "@/lib/redis";
import {QueueJobData} from "@/lib/queue";
import {automationEngine} from "@/lib/automation-engine";
import {executeActionInternal} from "@/lib/automation-engine-executor";
import {initializePluginSystemForWorker} from "@/lib/initialize-plugins.server";
import {db_save_resume_score} from "@/server/queries";
import {db_get_job_automation_rules} from "@/server/queries/drizzle/plugin-queries";
import {get_stale_holds_db, mark_hold_expired_db} from "@/server/queries/drizzle/interview";
import {releaseCalendarHold} from "@/server/google-calenda";
import {notify_hold_expired} from "@/server/holds/hold-service";
import {send_interview_reminders} from "@/server/interviews/reminder-service";

interface ScorePayload {
    score: number;
    breakdown: { fit: number; skills: number; experience: number };
    summary: string;
}

const worker = new Worker<QueueJobData>(
    'aplico_queue',

    async (job : Job<QueueJobData>) => {
        // Legacy smart-trigger jobs carry a different payload (no `event`)
        // and have no processor — the smart-trigger executor was never wired
        // into this worker. Skip them instead of crashing on the missing
        // `event`/`context` (previously every such job failed).
        if (!("event" in job.data)) {
            console.warn(`[Worker] Ignoring legacy smart_trigger job ${job.id} (no processor)`);
            return;
        }

        const { event, context } = job.data;
        const org_id  = context.organization_id;
        const job_id  = context.job?.job_id;

        console.log(`[Worker] Processing job ${job.id}: ${event.type} for org ${org_id}`);

        // Every enqueued event type is processed the same way (dispatch +
        // automation rules). Previously only `candidate_applied` was handled
        // and every other enqueued event (e.g. `resume_uploaded`) completed
        // as a silent no-op.
        // ── 1. Boot a fresh per-org registry ──────────────────────────────────
        // A new registry per job: the registry is bound to this org only, so
        // concurrent jobs for different orgs (concurrency 5) can never
        // dispatch with each other's providers/keys.
        await job.updateProgress(10);
        const registry = await initializePluginSystemForWorker(org_id);

        // ── 2. Reload automation rules from the DB on every job ───────────────
        // Rule edits/disables/deletes must take effect without a worker
        // restart — never serve a cached snapshot.
        await job.updateProgress(20);
        if (job_id) {
            const rules = await db_get_job_automation_rules(Number(job_id), org_id);
            automationEngine.loadJobRules(Number(job_id), rules);
        }

        // ── 3. Dispatch plugins ─────────────────────────────────────────────────
        await job.updateProgress(40);
        let pluginResults: Awaited<ReturnType<typeof registry.dispatch>> = [];
        try {
            pluginResults = await registry.dispatch(event, context);
            console.log(`[Worker] Fired ${pluginResults.length} integrations`);
        } catch (err) {
            console.error("[Worker] Plugin dispatch failed:", err);
            // Don't rethrow — automation rules should still run
        }

        // ── 4. Resume score (candidate_applied only) ──────────────────────────
        // Guarded: when Google/resume-score isn't installed nothing fires,
        // and the job must NOT crash — automation rules still run below.
        if (event.type === "candidate_applied") {
            const [fired_resume_score] = pluginResults.filter((result) => result.integrationId === "resume-score");

            if (fired_resume_score?.result?.success) {
                const payload = fired_resume_score.result.data as ScorePayload;
                const applicationId = event.applicationId ?? context.settings.applicationId as number;

                console.log("[trigger/public] fired_resume_score:", fired_resume_score);

                await db_save_resume_score({...payload, applicationId, model: fired_resume_score.result.metadata?.model ?? "unknown"})
            }
        }

        // ── 5. Run automation rules ─────────────────────────────────────────────
        // The worker has no Clerk session, so rules run through the internal
        // executor (org-verified queue context + this job's registry), never
        // through the authenticated server action.
        await job.updateProgress(70);
        try {
            await automationEngine.evaluate(event, context, {
                executor: (action, evt, ctx) =>
                    executeActionInternal(action, evt, ctx, { registry }),
            });
        } catch (err) {
            console.error("[Worker] Automation engine failed:", err);
        }

        await job.updateProgress(100);

        // Return a summary stored in BullMQ for debugging
        return {
            fired:   pluginResults.length,
            results: pluginResults.map(r => ({
                integration: r.integrationName,
                success:     r.result.success,
                error:       r.result.error ?? null,
            })),
        };
    },
    { connection: redis, concurrency: 5 }
);

// ── Interview hold expiry sweep ───────────────────────────────────────────────
// Runs on an interval (no BullMQ repeatable job — the sweep stays independent
// of the trigger queue): expires stale tentative holds AND releases their
// Google Calendar holds. A hold is only marked EXPIRED once its calendar
// event is released (or the release can't be retried); transient calendar
// failures leave the hold TENTATIVE so the next sweep retries it.
// Cadence: every 15 minutes, plus once at startup. Uses worker-safe DB
// helpers only (no Next cache revalidation — unavailable in this process).
const HOLD_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
let hold_sweep_running = false;

async function expire_stale_holds_sweep() {
    if (hold_sweep_running) return;
    hold_sweep_running = true;
    try {
        const stale = await get_stale_holds_db();
        if (stale.length === 0) return;

        let expired = 0;
        let deferred = 0;

        for (const row of stale) {
            try {
                if (row.calendar_event_id && row.calendar_owner_id) {
                    const released = await releaseCalendarHold({
                        clerkUserId: row.calendar_owner_id,
                        eventId: row.calendar_event_id,
                    });
                    if (!released.success && released.retryable) {
                        console.error(`[Worker] Hold ${row.id}: calendar release failed, will retry next sweep: ${released.error}`);
                        deferred += 1;
                        continue; // leave TENTATIVE so the next sweep retries
                    }
                    if (!released.success) {
                        console.error(`[Worker] Hold ${row.id}: calendar release failed permanently (${released.error}); marking expired anyway.`);
                    }
                }
                // Only notify when THIS sweep did the transition — the
                // guarded mark returns false if another sweeper (or the
                // cron route) already expired the hold, so a hold is
                // notified exactly once.
                const transitioned = await mark_hold_expired_db(row.id);
                if (!transitioned) continue;
                expired += 1;

                if (row.calendar_owner_id) {
                    await notify_hold_expired({
                        orgId: row.organization,
                        ownerId: row.calendar_owner_id,
                        applicationId: row.applications_id,
                        candidateName: row.candidate_name,
                        jobName: row.job_name,
                        start_at: row.start_at,
                        end_at: row.end_at,
                    });
                }
            } catch (err) {
                console.error(`[Worker] Hold ${row.id}: expiry sweep failed:`, err);
                deferred += 1;
            }
        }

        console.log(`[Worker] Hold expiry sweep: ${expired} expired, ${deferred} deferred.`);
    } catch (err) {
        console.error("[Worker] Hold expiry sweep failed:", err);
    } finally {
        hold_sweep_running = false;
    }
}

expire_stale_holds_sweep();
setInterval(expire_stale_holds_sweep, HOLD_SWEEP_INTERVAL_MS);

// ── Interview reminder sweep ──────────────────────────────────────────────────
// Same 15-min cadence (plus once at startup) and running-guard pattern as
// the hold sweep: sends the 24h reminder for confirmed/direct-scheduled
// interviews starting in the next 24h. reminder_sent_at is stamped only
// on successful send, so failures are retried next sweep.
const REMINDER_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
let reminder_sweep_running = false;

async function send_interview_reminders_sweep() {
    if (reminder_sweep_running) return;
    reminder_sweep_running = true;
    try {
        const result = await send_interview_reminders();
        console.log(`[Worker] Interview reminder sweep: ${result.sent} sent, ${result.failed} failed.`);
    } catch (err) {
        console.error("[Worker] Interview reminder sweep failed:", err);
    } finally {
        reminder_sweep_running = false;
    }
}

send_interview_reminders_sweep();
setInterval(send_interview_reminders_sweep, REMINDER_SWEEP_INTERVAL_MS);

// ── Lifecycle logging ─────────────────────────────────────────────────────────
worker.on("completed", (job) => {
    console.log(`[Worker] ✓ Job ${job.id} completed:`, job.returnvalue);
});

worker.on("failed", (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on("progress", (job, progress) => {
    console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

console.log("[Worker] Trigger worker started, waiting for jobs…");