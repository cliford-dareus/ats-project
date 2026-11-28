// ─────────────────────────────────────────────────────────────────────────────
// lib/slack.ts — Incoming-webhook posting for the Slack Notifications plugin.
//
// Mechanism: a Slack incoming webhook URL (https://hooks.slack.com/services/…).
// A webhook is bound to ONE channel when it is created in Slack — modern
// app-based webhooks ignore the `channel` / `username` / `icon_emoji`
// payload fields, so this module never sends them: the channel an org
// picks lives in the webhook URL itself, and the stored `channel` config
// value is only a display label. A bot token (chat.postMessage) would be
// needed for multi-channel routing or editing messages — that is a
// follow-up, not this plugin.
//
// Slack answers most webhook calls with HTTP 200 and a plain-text body:
// "ok" on success, or an error string ("invalid_payload", "channel_not_found",
// "no_service", …) — so a 2xx status alone never counts as delivered; the
// body is checked. The webhook URL is a secret: it is never logged here.
// ─────────────────────────────────────────────────────────────────────────────
import type { ATSContext, TriggerEvent } from "@/types";

export const SLACK_WEBHOOK_URL_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9_-]+$/;

export function isSlackWebhookUrl(value: string | undefined | null): boolean {
    if (!value) return false;
    return SLACK_WEBHOOK_URL_PATTERN.test(value.trim());
}

export interface SlackPostResult {
    ok: boolean;
    /** Slack's real response body on failure (e.g. "invalid_payload"). */
    error?: string;
}

/**
 * POST a plain-text message to an incoming webhook. Returns Slack's real
 * verdict — never throws for a Slack-side rejection, so callers can
 * surface the actual error instead of a generic failure.
 */
export async function postSlackWebhook(
    webhookUrl: string,
    text: string,
): Promise<SlackPostResult> {
    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            // Slack usually answers in well under a second; don't hang a
            // worker job or a settings save on a dead endpoint.
            signal: AbortSignal.timeout(10_000),
        });
        const body = (await res.text()).trim();
        if (res.ok && body === "ok") {
            return { ok: true };
        }
        // Non-2xx, or 200 with a non-"ok" body (e.g. "invalid_payload"):
        // Slack's own words are the error — never the URL.
        return { ok: false, error: body || `Slack returned HTTP ${res.status}` };
    } catch (err) {
        return { ok: false, error: (err as Error).message || "Failed to reach Slack" };
    }
}

/** "Nov 28, 2026, 11:44 AM" — readable in a channel, no timezone guessing. */
function formatWhen(date: Date): string {
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function jobLine(context: ATSContext): string {
    const job = context.job?.job_name;
    const department = context.job?.job_department;
    if (!job) return "";
    return department ? ` • ${job} (${department})` : ` • ${job}`;
}

/**
 * Real message for a stage move. Only facts present in the event/context
 * are used — the actor line appears only when the mover could actually
 * be resolved to a name (the kanban path carries no user id today, so
 * most stage messages simply omit it rather than inventing one).
 */
export function buildStageChangedMessage(
    event: Extract<TriggerEvent, { type: "stage_changed" }>,
    context: ATSContext,
    actorName?: string,
): string {
    const candidate = context.candidate?.name ?? "A candidate";
    const lines = [
        `🔀 ${candidate} moved from *${event.fromStage}* to *${event.toStage}*${jobLine(context)}`,
        ...(actorName ? [`Moved by ${actorName}`] : []),
        formatWhen(new Date()),
    ];
    return lines.join("\n");
}

/** Real message for a new application. */
export function buildCandidateAppliedMessage(
    event: Extract<TriggerEvent, { type: "candidate_applied" }>,
    context: ATSContext,
): string {
    const candidate = context.candidate?.name ?? "A candidate";
    const email = context.candidate?.email;
    const lines = [
        `📥 New application: *${candidate}*${email ? ` (${email})` : ""}${jobLine(context)}`,
        formatWhen(new Date()),
    ];
    return lines.join("\n");
}

/** The test message the settings UI posts to prove the webhook works. */
export function buildTestMessage(): string {
    return `✅ Applico test message — your Slack Notifications webhook is working. (${formatWhen(new Date())})`;
}
