// ─────────────────────────────────────────────────────────────────────────────
// Evaluates AutomationRules when TriggerEvents fire.
// Handles delays with setTimeout (swap for a job queue in production).
//
// This file is client-safe: it contains only the event emitter, rule management,
// and evaluation logic. The actual action handlers live in
// `automation-engine-actions.ts` (server-only) and are loaded dynamically at
// runtime so that `node:crypto` is never bundled for the client.
// ─────────────────────────────────────────────────────────────────────────────
import { EventEmitter } from "events";
import {
    delayToMs,
    type AutomationAction,
    type AutomationRule,
    type PendingExecution,
} from "@/types";
import type { ATSContext, TriggerEvent } from "@/types";

export interface AutomationExecutionResult {
    ruleId: string;
    ruleName: string;
    applicationId: number;
    success: boolean;
    action: AutomationAction;
    output?: unknown;
    error?: string;
    at: Date;
}

/**
 * Runs one automation action. The default executor is the authenticated
 * `executeAction` server action (browser/dashboard path). The BullMQ
 * worker passes its own executor bound to the internal, org-verified
 * `executeActionInternal` — the worker has no Clerk session, so it must
 * never go through the server action.
 */
export type AutomationActionExecutor = (
    action: AutomationAction,
    event: TriggerEvent,
    context: ATSContext,
) => Promise<unknown>;

export interface AutomationEvaluateOptions {
    executor?: AutomationActionExecutor;
}

/** The applications.id an event targets (never the candidate id). */
function eventApplicationId(event: TriggerEvent, context: ATSContext): number {
    if (typeof event.applicationId === "number") return event.applicationId;
    const fromSettings = Number(context.settings?.applicationId);
    return Number.isFinite(fromSettings) && fromSettings > 0 ? fromSettings : 0;
}

// ── AutomationEngine ──────────────────────────────────────────────────────────
const EMPTY_RULES: AutomationRule[] = [];

export class AutomationEngine extends EventEmitter {
    private rules = new Map<number, AutomationRule[]>();
    private pending = new Map<string, ReturnType<typeof setTimeout>>();

    // ── Rule management ───────────────────────────────────────────────────────
    loadJobRules(jobId: number, rules: AutomationRule[]): void {
        this.rules.set(jobId, rules);
        this.emit("rules:changed", jobId);
    }

    getRulesForJob(jobId: number): AutomationRule[] {
        return this.rules.get(jobId) ?? EMPTY_RULES;
    }

    upsertRule(rule: AutomationRule): void {
        const existing = this.rules.get(rule.job_id) ?? [];
        const idx = existing.findIndex(r => r.id === rule.id);

        // New array every time — React detects the reference change
        const next = idx >= 0
            ? existing.map((r, i) => i === idx ? rule : r)
            : [...existing, rule];

        this.rules.set(rule.job_id, next);
        console.log(next)
        this.emit("rules:changed", rule.job_id);
    }

    deleteRule(jobId: number, ruleId: string): void {
        const existing = this.rules.get(jobId) ?? [];
        this.rules.set(jobId, existing.filter(r => r.id !== ruleId));
        this.emit("rules:changed", jobId);
    }

    // ── Evaluation ────────────────────────────────────────────────────────────
    async evaluate(
        event: TriggerEvent,
        context: ATSContext,
        opts: AutomationEvaluateOptions = {},
    ): Promise<void> {
        const jobId = context.job?.job_id;
        if (!jobId) return;
        const rules = this.rules.get(jobId) ?? [];

        const matching = rules.filter(r => r.enabled && this._matchesTrigger(r.trigger, event));

        for (const rule of matching) {
            const delayMs = delayToMs(rule.delay);

            if (delayMs === 0) {
                await this._run(rule, event, context, opts);
            } else {
                // Schedule delayed execution
                const pending: PendingExecution = {
                    id: `exec_${rule.id}_${Date.now()}`,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    applicationId: eventApplicationId(event, context),
                    scheduledAt: Date.now() + delayMs,
                    event: event as unknown as Record<string, unknown>,
                    context: context as unknown as Record<string, unknown>,
                };
                console.log("AUTOMATION: ", pending)
                this.emit("execution:scheduled", pending);

                // In production: enqueue to Redis/BullMQ/Inngest instead of setTimeout
                const timerId = setTimeout(async () => {
                    this.pending.delete(rule.id);
                    await this._run(rule, event, context, opts);
                }, delayMs);

                this.pending.set(rule.id, timerId);
            }
        }
    }

    private _matchesTrigger(
        trigger: AutomationRule["trigger"],
        event: TriggerEvent,
    ): boolean {
        if (trigger.event !== event.type) return false;

        if (trigger.event === "stage_changed" && event.type === "stage_changed") {
            if (trigger.toStage && trigger.toStage !== event.toStage) return false;
            if (trigger.fromStage && trigger.fromStage !== event.fromStage) return false;
        }

        return true;
    }

    private async _run(
        rule: AutomationRule,
        event: TriggerEvent,
        context: ATSContext,
        opts: AutomationEvaluateOptions = {},
    ): Promise<void> {
        const applicationId = eventApplicationId(event, context);
        try {
            // Default executor: the authenticated server action (browser path).
            // Dynamically import the server-only action handlers so that
            // `node:crypto` (used by plugin-encryption) is never bundled for
            // the client. The import resolves at runtime when the action runs.
            const executor: AutomationActionExecutor = opts.executor ?? (async (action, evt, ctx) => {
                const { executeAction } = await import("./automation-engine-actions");
                return executeAction(action, evt, ctx);
            });
            const output = await executor(rule.action, event, context);
            const result: AutomationExecutionResult = {
                ruleId: rule.id,
                ruleName: rule.name,
                applicationId,
                success: true,
                action: rule.action,
                output,
                at: new Date(),
            };
            this.emit("execution:completed", result);
        } catch (err) {
            const result: AutomationExecutionResult = {
                ruleId: rule.id,
                ruleName: rule.name,
                applicationId,
                success: false,
                action: rule.action,
                error: err instanceof Error ? err.message : String(err),
                at: new Date(),
            };
            this.emit("execution:failed", result);
        }
    }

    // ── Subscribe helper for useSyncExternalStore ─────────────────────────────
    subscribe(jobId: number, cb: () => void): () => void {
        // Wrap cb so it only fires when the changed jobId matches
        const listener = (changedJobId: number) => {
            if (changedJobId === jobId) cb();
        };
        this.on("rules:changed", listener);
        return () => this.off("rules:changed", listener);
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const automationEngine = new AutomationEngine();
