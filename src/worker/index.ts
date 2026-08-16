import "dotenv/config";
import {Worker, type Job} from "bullmq";
import redis from "@/lib/redis";
import {TriggerJobData} from "@/lib/queue";
import {automationEngine} from "@/lib/automation-engine";
import {pluginRegistry} from "@/lib/plugin-registry";
import {initializePluginSystemForWorker} from "@/lib/initialize-plugins.server";
import {db_save_resume_score} from "@/server/queries";
import {db_get_job_automation_rules} from "@/server/queries/drizzle/plugin-queries";

interface ScorePayload {
    score: number;
    breakdown: { fit: number; skills: number; experience: number };
    summary: string;
}

const worker = new Worker<TriggerJobData>(
    'aplico_queue',

    async (job : Job<TriggerJobData>) => {
        const { event, context } = job.data;
        const org_id  = context.organization_id;
        const job_id  = context.job?.job_id;

        console.log(`[Worker] Processing job ${job.id}: ${event.type} for org ${org_id}`);

        if(event.type === "candidate_applied") {
            // ── 1. Boot registry for this org ──────────────────────────────────────
            await job.updateProgress(10);
            await initializePluginSystemForWorker(org_id);

            // ── 2. Load automation rules for this job ───────────────────────────────
            await job.updateProgress(20);
            const existingRules = automationEngine.getRulesForJob(Number(job_id));
            if (existingRules.length === 0) {
                const rules = await db_get_job_automation_rules(Number(job_id), org_id);
                automationEngine.loadJobRules(Number(job_id), rules);
            }

            // ── 3. Dispatch plugins ─────────────────────────────────────────────────
            await job.updateProgress(40);
            let pluginResults: Awaited<ReturnType<typeof pluginRegistry.dispatch>> = [];
            try {
                pluginResults = await pluginRegistry.dispatch(event, context);
                console.log(`[Worker] Fired ${pluginResults.length} integrations`);
            } catch (err) {
                console.error("[Worker] Plugin dispatch failed:", err);
                // Don't rethrow — automation rules should still run
            }

            const [fired_resume_score] = pluginResults.filter((result) => result.integrationId === "resume-score");
            const payload = fired_resume_score.result.data as ScorePayload;

            console.log("[trigger/public] fired_resume_score:", fired_resume_score);

            if (fired_resume_score.result.success) {
                await db_save_resume_score({...payload, applicationId: context.settings.applicationId as number, model: fired_resume_score.result.metadata.model})
            }

            // ── 4. Run automation rules ─────────────────────────────────────────────
            await job.updateProgress(70);
            try {
                await automationEngine.evaluate(event, context);
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

        }
    },
    { connection: redis, concurrency: 5 }
);

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