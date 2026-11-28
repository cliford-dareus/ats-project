import "dotenv/config";
import {Worker, type Job} from "bullmq";
import redis from "@/lib/redis";
import {QueueJobData, taskQueue, type DelayedAutomationJobData, type WebhookDeliveryJobData} from "@/lib/queue";
import { ATSPluginRegistry } from "@/lib/plugin-registry";
import {automationEngine, type AutomationExecutionResult} from "@/lib/automation-engine";
import {executeActionInternal} from "@/lib/automation-engine-executor";
import {initializePluginSystemForWorker} from "@/lib/initialize-plugins.server";
import { record_activity_system } from "@/server/activity/record-activity-system";
import type { ATSContext, TriggerEvent } from "@/types";
import {db_save_resume_score} from "@/server/queries";
import {db_get_job_automation_rules} from "@/server/queries/drizzle/plugin-queries";
import {get_stale_holds_db, mark_hold_expired_db} from "@/server/queries/drizzle/interview";
import {releaseCalendarHold} from "@/server/google-calenda";
import {notify_hold_expired} from "@/server/holds/hold-service";
import {send_interview_reminders} from "@/server/interviews/reminder-service";
import { build_worker_webhook_data } from "@/lib/webhooks/events";
import { enqueue_webhook_deliveries } from "@/lib/webhooks/enqueue";
import { deliver_webhook_attempt } from "@/lib/webhooks/deliver";

interface ScorePayload {
    score: number;
    breakdown: { fit: number; skills: number; experience: number };
    summary: string;
}

/** The applications.id an event targets (never the candidate id). */
function eventApplicationId(event: TriggerEvent, context: ATSContext): number {
    if (typeof event.applicationId === "number") return event.applicationId;
    const fromSettings = Number(context.settings?.applicationId);
    return Number.isFinite(fromSettings) && fromSettings > 0 ? fromSettings : 0;
}

type ExecutionFailure = {
    ruleId: string;
    ruleName: string;
    applicationId: number;
    error: string;
};

/**
 * Best-effort worker-side audit write (never throws). Truncated: the
 * activity summary column is varchar(512). Error text is an integration
 * / automation message — never a credential value.
 */
async function persistWorkerActivity(
    orgId: string,
    action: string,
    applicationId: number,
    summary: string,
): Promise<void> {
    await record_activity_system({
        orgId,
        action,
        entity_type: "application",
        entity_id: applicationId || 0,
        summary: summary.slice(0, 450),
    });
}

/**
 * Attach per-job execution listeners to the shared automationEngine
 * singleton. MUST be detached after the job — the engine is
 * process-wide, so a leaked listener would fire for other orgs' jobs.
 * Returns the collected failures and a detach function.
 */
function attachExecutionListeners(
    orgId: string,
    persist: (failure: ExecutionFailure) => void,
): { failures: ExecutionFailure[]; detach: () => void } {
    const failures: ExecutionFailure[] = [];
    const onCompleted = (result: AutomationExecutionResult) => {
        console.log(`[Worker] Automation rule "${result.ruleName}" (${result.ruleId}) completed for application ${result.applicationId} (org ${orgId})`);
    };
    const onFailed = (result: AutomationExecutionResult) => {
        const failure: ExecutionFailure = {
            ruleId: result.ruleId,
            ruleName: result.ruleName,
            applicationId: result.applicationId,
            error: result.error ?? "Unknown error",
        };
        failures.push(failure);
        console.error(`[Worker] Automation rule "${result.ruleName}" (${result.ruleId}) failed for application ${result.applicationId} (org ${orgId}): ${result.error}`);
        persist(failure);
    };
    automationEngine.on("execution:completed", onCompleted);
    automationEngine.on("execution:failed", onFailed);
    return {
        failures,
        detach: () => {
            automationEngine.off("execution:completed", onCompleted);
            automationEngine.off("execution:failed", onFailed);
        },
    };
}

/**
 * B8 — delayed automation job: a rule whose delay was scheduled by an
 * earlier trigger job as a durable BullMQ delayed job (not setTimeout).
 * Runs the stored rule action via executeActionInternal with the stored
 * event/context and a fresh per-org registry.
 */
async function handleDelayedAutomationJob(job: Job<QueueJobData>) {
    const { rule, event, context } = (job.data as DelayedAutomationJobData).delayedAutomation;
    const org_id = context.organization_id;
    console.log(`[Worker] Running delayed automation (rule "${rule.name}" ${rule.id}) for org ${org_id}`);

    let registry: ATSPluginRegistry;
    try {
        registry = await initializePluginSystemForWorker(org_id);
    } catch (err) {
        console.error(`[Worker] Plugin init failed for org ${org_id} (delayed job ${job.id}) — continuing with empty registry:`, err);
        registry = new ATSPluginRegistry();
    }

    const persistPromises: Promise<void>[] = [];
    const { failures, detach } = attachExecutionListeners(org_id, (failure) => {
        persistPromises.push(persistWorkerActivity(
            org_id,
            "automation.execution_failed",
            failure.applicationId,
            `Automation rule "${failure.ruleName}" failed: ${failure.error}`,
        ));
    });
    try {
        // runStoredExecution never throws (_run catches and emits
        // execution:failed) — the try is a guard only.
        await automationEngine.runStoredExecution(rule, event, context, {
            executor: (action, evt, ctx) =>
                executeActionInternal(action, evt, ctx, { registry }),
        });
    } catch (err) {
        console.error(`[Worker] Delayed automation (rule "${rule.name}") failed:`, err);
    } finally {
        detach();
    }
    await Promise.allSettled(persistPromises);

    return {
        delayed: true,
        ruleId: rule.id,
        ruleName: rule.name,
        failures,
    };
}

/**
 * Outbound webhooks — one delivery job per (event occurrence,
 * subscription) (feat/plugin-webhooks). deliver_webhook_attempt records
 * the attempt row and THROWS on delivery failure, so BullMQ retries with
 * the queue's bounded policy (3 attempts, exponential backoff); the
 * throw propagates here so the job is marked failed and retried. A
 * skipped delivery (bad URL / missing or inactive subscription) does not
 * throw — retrying it cannot help.
 */
async function handleWebhookDeliveryJob(job: Job<QueueJobData>) {
    const { webhookDelivery } = job.data as WebhookDeliveryJobData;
    console.log(`[Worker] Delivering webhook ${webhookDelivery.event} to subscription ${webhookDelivery.subscriptionId} (delivery ${webhookDelivery.deliveryId}, attempt ${job.attemptsMade + 1})`);
    const outcome = await deliver_webhook_attempt(webhookDelivery, job.attemptsMade + 1);
    return {
        webhook: true,
        deliveryId: webhookDelivery.deliveryId,
        subscriptionId: webhookDelivery.subscriptionId,
        event: webhookDelivery.event,
        ...outcome,
    };
}

const worker = new Worker<QueueJobData>(
    'aplico_queue',

    async (job : Job<QueueJobData>) => {
        // B8: delayed automation jobs carry a different payload (no
        // `event`) — run the stored rule, don't fall through to the
        // legacy-job skip below.
        if ("delayedAutomation" in job.data) {
            return handleDelayedAutomationJob(job);
        }

        // Outbound webhooks (feat/plugin-webhooks): a delivery job carries
        // `webhookDelivery` and no `event` — deliver it, don't fall
        // through to the legacy-job skip below.
        if ("webhookDelivery" in job.data) {
            return handleWebhookDeliveryJob(job);
        }

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
        //
        // B1: init used to sit outside any try/catch — one bad credential
        // (or DB blip) killed the whole job. On failure, continue with an
        // empty unbound registry: dispatch is a no-op (no providers) but
        // the automation rules below still run.
        await job.updateProgress(10);
        let registry: ATSPluginRegistry;
        try {
            registry = await initializePluginSystemForWorker(org_id);
        } catch (err) {
            console.error(`[Worker] Plugin init failed for org ${org_id} (job ${job.id}) — continuing with empty registry:`, err);
            registry = new ATSPluginRegistry();
        }

        // B3: integration failures used to be emitted into the void (zero
        // listeners existed). Collect them here, persist each via the
        // worker-safe activity helper, and include them in the job return
        // value below. The registry is per-job, so no listener cleanup is
        // needed. Persist promises are awaited before the job returns.
        const dispatchFailures: { integration: string; error: string }[] = [];
        const persistPromises: Promise<void>[] = [];
        registry.on("integration:error", (payload: { key: string; event: TriggerEvent; error: string }) => {
            const integrationId = payload.key.split(":")[1] ?? payload.key;
            dispatchFailures.push({ integration: integrationId, error: payload.error });
            console.error(`[Worker] Integration ${integrationId} failed for org ${org_id} (job ${job.id}): ${payload.error}`);
            persistPromises.push(persistWorkerActivity(
                org_id,
                "plugin.dispatch_failed",
                eventApplicationId(payload.event, context),
                `Integration ${integrationId} failed: ${payload.error}`,
            ));
        });

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

        // ── 3b. Outbound webhooks (feat/plugin-webhooks) ──────────────────────
        // Fan out to the org's subscribed webhook URLs. Only the events
        // that actually reach this worker have a payload builder
        // (candidate_applied, resume_uploaded — see
        // build_worker_webhook_data); stage/interview events never reach
        // the queue and enqueue their deliveries directly from their
        // server actions instead. Best-effort: enqueueing never fails
        // this job — the event already happened.
        const webhookEvent = build_worker_webhook_data(event, context);
        if (webhookEvent) {
            await enqueue_webhook_deliveries({
                orgId: org_id,
                event: webhookEvent.event,
                data: webhookEvent.data,
            });
        }

        // ── 4. Resume score (candidate_applied only) ──────────────────────────
        // Guarded: when no resume scorer is installed nothing fires, and
        // the job must NOT crash — automation rules still run below.
        // Two scorers can provide a score — Google ("resume-score") and
        // OpenAI ("resume-score-openai") — but the applications row holds
        // ONE score, labelled by resume_score_model. When both fire,
        // Google wins: it is the pre-existing scorer, so orgs that
        // already had Google keep their behaviour; the OpenAI result is
        // used only when Google didn't fire or failed. (A per-org
        // preferred-scorer setting is the follow-up; until then,
        // installing both means both APIs are called and only one score
        // is saved.)
        if (event.type === "candidate_applied") {
            const fired_scores = pluginResults.filter((result) =>
                result.integrationId === "resume-score" ||
                result.integrationId === "resume-score-openai"
            );
            const fired_resume_score =
                fired_scores.find((r) => r.integrationId === "resume-score" && r.result?.success) ??
                fired_scores.find((r) => r.integrationId === "resume-score-openai" && r.result?.success);

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
        // B8: per-job execution listeners (log + persist failures via the
        // worker-safe helper). Detached in the finally — the engine is a
        // process-wide singleton.
        const { failures: executionFailures, detach } = attachExecutionListeners(org_id, (failure) => {
            persistPromises.push(persistWorkerActivity(
                org_id,
                "automation.execution_failed",
                failure.applicationId,
                `Automation rule "${failure.ruleName}" failed: ${failure.error}`,
            ));
        });
        try {
            await automationEngine.evaluate(event, context, {
                executor: (action, evt, ctx) =>
                    executeActionInternal(action, evt, ctx, { registry }),
                // B8: delayed rules become durable BullMQ delayed jobs
                // carrying rule + event + context (keyed by execution id),
                // not setTimeout — a worker restart no longer loses them.
                scheduleDelayed: async (pending, rule, evt, evtContext, delayMs) => {
                    await taskQueue.add("delayed_automation", {
                        delayedAutomation: {
                            executionId: pending.id,
                            rule,
                            event: evt,
                            context: { ...evtContext, subdomain: context.subdomain },
                        },
                    }, { delay: delayMs, jobId: pending.id });
                    console.log(`[Worker] Delayed automation ${pending.id} (rule "${rule.name}") scheduled in ${delayMs}ms for org ${org_id}`);
                },
            });
        } catch (err) {
            console.error("[Worker] Automation engine failed:", err);
        } finally {
            detach();
        }

        // Persisted failure entries must land before the job completes.
        await Promise.allSettled(persistPromises);

        await job.updateProgress(100);

        // Return a summary stored in BullMQ for debugging
        return {
            fired:   pluginResults.length,
            failures: dispatchFailures,
            executionFailures,
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