// ─────────────────────────────────────────────────────────────────────────────
// lib/teams.ts — Webhook posting for the Microsoft Teams Notifications plugin.
//
// Mechanism: ONE webhook URL per org (stored encrypted, like every other
// plugin secret). The URL is bound to a single Teams channel when it is
// created — the payload cannot pick another channel, so there is no
// per-event channel routing here. The stored `channel` config value is a
// display label only ("General").
//
// Two webhook kinds exist, and both are accepted:
//   • Workflows (Power Automate) — the current way to create a webhook in
//     Teams: channel → Workflows → "Post to a channel when a webhook
//     request is received". URL host is `<region>.logic.azure.com`
//     (or `<env>.environment.api.powerplatform.com`).
//   • Classic Incoming Webhook (Office 365 Connector) — host
//     `<tenant>.webhook.office.com` / `outlook.office.com/webhook/…`.
//     Microsoft is RETIRING Office 365 Connectors (creation of new ones
//     is being blocked; existing ones stop working after the retirement
//     rollout) — users should create a Workflows webhook instead. The
//     legacy host is accepted only so orgs with an existing connector
//     keep working until they migrate.
//
// Payload: an Adaptive Card wrapped in a `message` envelope — the format
// the Workflows trigger documents, and one the classic connector also
// renders (Microsoft Learn: "Adaptive Cards can be sent through Incoming
// Webhooks"). One payload for both endpoints, no per-host branching.
// Slack's `{ text }` shape does NOT work here; Teams needs the card.
//
// Success is NOT the same for both endpoints — be honest about it:
//   • Classic connector: HTTP 200 with the plain-text body "1" means the
//     message is in the channel. Anything else is Teams' own error.
//   • Workflows: HTTP 202 means the workflow ACCEPTED the request. The
//     workflow runs after that, so 202 does not prove the message is in
//     the channel — a card the workflow cannot render fails in the
//     workflow's run history in Power Automate, not in this response.
//     Callers report 202 as "accepted", never as "posted".
//
// Limits worth knowing (Microsoft Learn): 28 KB message size (our cards
// are far under it) and throttling above ~4 requests/second — not a
// concern at ATS event volume; no retry/backoff is added here.
//
// The webhook URL is a secret: it is never logged here.
// ─────────────────────────────────────────────────────────────────────────────
import type { ATSContext, TriggerEvent } from "@/types";

// Legacy connector hosts + the Workflows (Power Automate) hosts.
export const TEAMS_WEBHOOK_URL_PATTERN =
    /^https:\/\/(?:outlook\.office\.com\/webhook\/[A-Za-z0-9_/-]+|[A-Za-z0-9.-]+\.webhook\.office\.com\/webhookb2\/[A-Za-z0-9_/-]+|[A-Za-z0-9.-]+\.logic\.azure\.com(?::443)?\/[A-Za-z0-9_/?&=.%-]+|[A-Za-z0-9.-]+\.environment\.api\.powerplatform\.com\/[A-Za-z0-9_/?&=.%-]+)$/;

export function isTeamsWebhookUrl(value: string | undefined | null): boolean {
    if (!value) return false;
    return TEAMS_WEBHOOK_URL_PATTERN.test(value.trim());
}

/** A Teams webhook URL on a Workflows (Power Automate) host. */
export function isTeamsWorkflowUrl(value: string): boolean {
    return /\.logic\.azure\.com\/|\.environment\.api\.powerplatform\.com\//.test(value);
}

export interface TeamsPostResult {
    ok: boolean;
    /** True when the endpoint accepted the request but delivery is async
     * (Workflows 202) — the message is NOT confirmed in the channel. */
    accepted?: boolean;
    /** Teams' real response body on failure (never the URL). */
    error?: string;
}

/** One card's content: a title, a detail line, and optional name/value facts. */
export interface TeamsMessage {
    title: string;
    text: string;
    facts?: { name: string; value: string }[];
}

/** Build the Adaptive Card envelope Teams expects. */
export function buildTeamsCardPayload(message: TeamsMessage): Record<string, unknown> {
    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "TextBlock",
                            text: message.title,
                            weight: "Bolder",
                            size: "Medium",
                            wrap: true,
                        },
                        {
                            type: "TextBlock",
                            text: message.text,
                            wrap: true,
                        },
                        ...(message.facts?.length
                            ? [
                                  {
                                      type: "FactSet",
                                      facts: message.facts.map((f) => ({
                                          title: f.name,
                                          value: f.value,
                                      })),
                                  },
                              ]
                            : []),
                    ],
                },
            },
        ],
    };
}

/**
 * POST a card to a Teams webhook. Returns Teams' real verdict — never
 * throws for a Teams-side rejection, so callers can surface the actual
 * error instead of a generic failure. A 202 (Workflows) is reported as
 * `accepted: true`, not as delivered — see the header.
 */
export async function postTeamsWebhook(
    webhookUrl: string,
    message: TeamsMessage,
): Promise<TeamsPostResult> {
    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildTeamsCardPayload(message)),
            // Teams usually answers in well under a second; don't hang a
            // worker job or a settings save on a dead endpoint.
            signal: AbortSignal.timeout(10_000),
        });
        const body = (await res.text()).trim();
        if (res.status === 202) {
            // Workflows accepted the request; the flow runs afterwards.
            return { ok: true, accepted: true };
        }
        if (res.ok && body === "1") {
            // Classic connector: "1" is the delivery confirmation.
            return { ok: true };
        }
        // Non-2xx, or 200 with a body that isn't "1" (e.g. an expired
        // connector answers 200 with an error string): Teams' own words
        // are the error — never the URL.
        return { ok: false, error: body || `Teams returned HTTP ${res.status}` };
    } catch (err) {
        return { ok: false, error: (err as Error).message || "Failed to reach Teams" };
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
    return department ? `${job} (${department})` : job;
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
): TeamsMessage {
    const candidate = context.candidate?.name ?? "A candidate";
    const job = jobLine(context);
    return {
        title: `${candidate} moved from ${event.fromStage} to ${event.toStage}`,
        text: `Stage changed${job ? ` • ${job}` : ""}`,
        facts: [
            ...(actorName ? [{ name: "Moved by", value: actorName }] : []),
            { name: "When", value: formatWhen(new Date()) },
        ],
    };
}

/** Real message for a new application. */
export function buildCandidateAppliedMessage(
    event: Extract<TriggerEvent, { type: "candidate_applied" }>,
    context: ATSContext,
): TeamsMessage {
    const candidate = context.candidate?.name ?? "A candidate";
    const email = context.candidate?.email;
    const job = jobLine(context);
    return {
        title: `New application: ${candidate}`,
        text: `${email ? `${email} • ` : ""}${job || "Applico"}`,
        facts: [{ name: "When", value: formatWhen(new Date()) }],
    };
}

/** The test message the settings UI posts to prove the webhook works. */
export function buildTestMessage(): TeamsMessage {
    return {
        title: "Applico test message",
        text: "Your Microsoft Teams Notifications webhook is working.",
        facts: [{ name: "When", value: formatWhen(new Date()) }],
    };
}
