// ─────────────────────────────────────────────────────────────────────────────
// src/lib/webhooks/events.ts — the outbound-webhook event catalogue.
//
// Only events the app ACTUALLY fires are listed here. The TriggerEvent
// union in src/types also declares `offer_extended` and `score_updated`,
// but no code anywhere fires either of them (no offer action exists, and
// the resume score is saved in the worker without emitting an event), so
// offering them as subscriptions would be a lie — a subscriber would wait
// forever for an event that can never arrive. They stay out until a real
// firing site exists.
//
// Firing sites (each enqueues one BullMQ delivery job per matching
// subscription — see enqueue.ts):
//   • candidate_applied, resume_uploaded — the BullMQ worker
//     (src/worker/index.ts), reached from the public apply form via
//     fire_public_trigger_action / /api/trigger/public.
//   • stage_changed — moveApplicationAndReorder
//     (src/server/actions/application_actions.ts).
//   • interview_scheduled — create_interview_action and
//     reschedule_interview_action (a reschedule is a new scheduled time).
//   • interview_cancelled — cancel_interview_action.
//     NOTE: this one is webhook-only — it is not a TriggerEvent, because
//     the plugin/automation engine has no cancel firing site and no
//     provider listens for it. Adding it to TriggerEvent would imply a
//     dispatch path that does not exist.
// ─────────────────────────────────────────────────────────────────────────────
import type { ATSContext, TriggerEvent } from "@/types";

/** Events an org can subscribe a webhook URL to. */
export const WEBHOOK_EVENTS = [
    "candidate_applied",
    "stage_changed",
    "interview_scheduled",
    "interview_cancelled",
    "resume_uploaded",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export const is_webhook_event = (value: unknown): value is WebhookEventType =>
    typeof value === "string" &&
    (WEBHOOK_EVENTS as readonly string[]).includes(value);

/** UI labels for the subscription form. */
export const WEBHOOK_EVENT_META: Record<
    WebhookEventType,
    { label: string; description: string }
> = {
    candidate_applied: {
        label: "Candidate applied",
        description: "A candidate submits an application for one of your jobs.",
    },
    stage_changed: {
        label: "Stage changed",
        description: "An application is moved to a different pipeline stage.",
    },
    interview_scheduled: {
        label: "Interview scheduled",
        description: "An interview is scheduled, or rescheduled to a new time.",
    },
    interview_cancelled: {
        label: "Interview cancelled",
        description: "A scheduled interview is cancelled.",
    },
    resume_uploaded: {
        label: "Resume uploaded",
        description: "A resume file is uploaded with an application.",
    },
};

/** The JSON body POSTed to a subscriber. `data` carries only real facts
 *  about the event — candidate/job/application/interview identifiers and
 *  display names, never secrets, tokens, or internal credentials. */
export interface WebhookPayload {
    event: WebhookEventType;
    /** Per-occurrence id (uuid) — stable across retries of one delivery. */
    event_id: string;
    occurred_at: string;
    organization_id: string;
    data: Record<string, unknown>;
}

/** Event-specific `data` shapes (all fields are real DB values resolved at
 *  the firing site; nullable when the source row has no value). */
export type WebhookEventData =
    | {
          candidate: { id: string; name: string | null; email: string | null };
          job: { id: number | null; name: string | null };
          application: { id: number | null };
      }
    | {
          candidate: { id: string; name: string | null; email: string | null };
          job: { id: number | null; name: string | null };
          application: { id: number | null };
          from_stage: string | null;
          to_stage: string | null;
      }
    | {
          candidate: { id: number | null; name: string | null; email: string | null };
          job: { id: number | null; name: string | null };
          application: { id: number | null };
          interview: {
              id: number;
              start_at: string | null;
              end_at: string | null;
              type: string | null;
              location: string | null;
              link: string | null;
              status: string | null;
              cancel_reason: string | null;
          };
      }
    | {
          candidate: { id: string; name: string | null; email: string | null };
          job: { id: number | null; name: string | null };
          application: { id: number | null };
          file_url: string;
      };

/**
 * Build the webhook `data` for an event the BullMQ worker sees, from the
 * queued TriggerEvent + ATSContext. Only the two events that actually
 * reach the worker have a builder — `stage_changed` /
 * `interview_scheduled` / `interview_cancelled` never reach the queue
 * (their firing sites enqueue webhook deliveries directly), so building
 * them here would imply a dispatch path that does not exist.
 * Returns null for any other event type.
 */
export function build_worker_webhook_data(
    event: TriggerEvent,
    context: ATSContext,
): { event: WebhookEventType; data: WebhookEventData } | null {
    const candidate = {
        id: event.candidateId,
        name: context.candidate?.name ?? null,
        email: context.candidate?.email ?? null,
    };
    const job = {
        id: (context.job?.job_id as number | undefined) ?? null,
        name: (context.job?.job_name as string | undefined) ?? null,
    };
    const application = {
        id: event.applicationId ?? (context.settings?.applicationId as number | undefined) ?? null,
    };

    switch (event.type) {
        case "candidate_applied":
            return { event: "candidate_applied", data: { candidate, job, application } };
        case "resume_uploaded":
            return {
                event: "resume_uploaded",
                data: { candidate, job, application, file_url: event.fileUrl },
            };
        default:
            return null;
    }
}
