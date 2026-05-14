// ─────────────────────────────────────────────────────────────────────────────
// Evaluates AutomationRules when TriggerEvents fire.
// Handles delays with setTimeout (swap for a job queue in production).
// ─────────────────────────────────────────────────────────────────────────────
import { EventEmitter } from "events";
import {
    delayToMs,
    interpolate,
    type AutomationAction,
    type AutomationRule,
    type PendingExecution,
} from "../types";
import type { ATSContext, TriggerEvent } from "../types";

export interface AutomationExecutionResult {
    ruleId: string;
    ruleName: string;
    success: boolean;
    action: AutomationAction;
    output?: unknown;
    error?: string;
    at: Date;
}

// ── Execution handlers ────────────────────────────────────────────────────────
// Each action type has a handler. Real implementations call your DB / API.
async function executeAction(
    action: AutomationAction,
    event: TriggerEvent,
    context: ATSContext,
): Promise<unknown> {
    // Build interpolation vars from context
    const vars: Record<string, string> = {
        "candidate.name": context.candidate?.name ?? "",
        "candidate.email": context.candidate?.email ?? "",
        "candidate.id": context.candidate?.id?.toString() ?? "",
        "job.title": context.job?.job_name ?? "",
        "job.department": context.job?.job_department ?? "",
        "org.id": context.organization_id,
        "stage": "toStage" in event ? event.toStage : "",
    };

    switch (action.type) {
        case "add_note": {
            const content = interpolate(action.content, vars);
            // Real: await db.note.create({ candidateId: context.candidate?.id, content, pinned: action.pinned })
            console.log(`[AutomationEngine] add_note → "${content.slice(0, 60)}…"`);
            return { noteId: `note_${Date.now()}`, content };
        }

        case "send_sms": {
            const message = interpolate(action.message, vars);
            const toEmail =
                action.to === "candidate" ? context.candidate?.email :
                    action.to === "recruiter" ? (context.settings.recruiterPhone as string) :
        /* hiring_manager */              (context.settings.hiringManagerPhone as string);

            // Real: await twilioClient.messages.create({ to: toPhone, from: process.env.TWILIO_FROM, body: message })
            console.log(`[AutomationEngine] send_sms → ${action.to} (${toEmail}): "${message.slice(0, 60)}"`);
            return { messageSid: `SM${Date.now()}`, to: action.to, message };
        }

        case "send_email": {
            const subject = interpolate(action.subject, vars);
            // const body = interpolate(action.body, vars);
            const toEmail =
                action.to === "candidate" ? context.candidate?.email :
                    action.to === "recruiter" ? (context.settings.recruiterEmail as string) :
        /* hiring_manager */              (context.settings.hiringManagerEmail as string);

            // Real: await resend.emails.send({ from, to: toEmail, subject, html: body })
            console.log(`[AutomationEngine] send_email → ${toEmail}: "${subject}"`);
            return { emailId: `email_${Date.now()}`, to: toEmail, subject };
        }

        case "fire_integration": {
            // Dynamically import to avoid circular deps with plugin-registry
            const { pluginRegistry } = await import("./plugin-registry");
            const integration = pluginRegistry.getIntegration(action.providerId, action.integrationId);
            if (!integration) throw new Error(`Integration ${action.providerId}:${action.integrationId} not found`);
            return integration.execute(event, context);
        }

        case "move_stage": {
            // Real: await db.candidateJob.update({ where: { id: context.candidate?.id }, data: { stage: action.toStage } })
            console.log(`[AutomationEngine] move_stage → ${action.toStage}`);
            return { toStage: action.toStage };
        }

        case "assign_recruiter": {
            // Real: await db.candidateJob.update({ where: { id: context.candidate?.id }, data: { recruiterId: action.userId } })
            console.log(`[AutomationEngine] assign_recruiter → ${action.userId}`);
            return { assignedTo: action.userId };
        }

        default:
            throw new Error(`Unknown action type: ${(action as AutomationAction).type}`);
    }
};

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
    async evaluate(event: TriggerEvent, context: ATSContext): Promise<void> {
        const jobId = context.job?.job_id;
        if (!jobId) return;
        const rules = this.rules.get(jobId) ?? [];

        const matching = rules.filter(r => r.enabled && this._matchesTrigger(r.trigger, event));

        for (const rule of matching) {
            const delayMs = delayToMs(rule.delay);

            if (delayMs === 0) {
                await this._run(rule, event, context);
            } else {
                // Schedule delayed execution
                const pending: PendingExecution = {
                    id: `exec_${rule.id}_${Date.now()}`,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    scheduledAt: Date.now() + delayMs,
                    event: event as unknown as Record<string, unknown>,
                    context: context as unknown as Record<string, unknown>,
                };
                this.emit("execution:scheduled", pending);

                // In production: enqueue to Redis/BullMQ/Inngest instead of setTimeout
                const timerId = setTimeout(async () => {
                    this.pending.delete(rule.id);
                    await this._run(rule, event, context);
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
    ): Promise<void> {
        try {
            const output = await executeAction(rule.action, event, context);
            const result: AutomationExecutionResult = {
                ruleId: rule.id,
                ruleName: rule.name,
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
