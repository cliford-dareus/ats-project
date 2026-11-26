// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY — Internal automation action executor.
//
// This file has NO "use server" directive on purpose: `executeActionInternal`
// is NOT a server action and must never be invocable from the browser.
// It runs only in two trusted paths:
//   1. The BullMQ worker (no Clerk session) — the queue payload was verified
//      server-side at enqueue time (see trigger-actions.ts / api/trigger).
//   2. The exported `executeAction` server action in
//      ./automation-engine-actions.ts — which authenticates (getAuthOrThrow),
//      requires `job:edit`, and replaces the org with the session org before
//      delegating here.
//
// Either way, NOTHING about identity is trusted from the caller: the
// application is re-resolved from the database by id, the candidate and job
// are loaded from the DB, and the org always comes from the (session- or
// queue-verified) context. `event.candidateId` is the CANDIDATES id and
// `event.applicationId` (or the legacy `context.settings.applicationId`) is
// the APPLICATIONS id — the two are never conflated: add_note targets the
// candidate, move_stage targets the application.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutomationAction, ATSContext, TriggerEvent } from "@/types";
import { interpolate } from "@/types";
import type { ATSPluginRegistry } from "./plugin-registry";

export interface AutomationExecutorOptions {
    /**
     * Pre-built org-bound registry (worker path). When omitted, the server
     * path builds a fresh per-org registry on demand (fire_integration).
     */
    registry?: ATSPluginRegistry;
}

/** Everything about the automation target, resolved from the DB. */
interface ResolvedAutomationTarget {
    orgId: string;
    userId: string;
    applicationId: number;
    candidateId: number;
    candidate: { id: number; name: string; email: string };
    job: { job_id: number; job_name: string; job_department: string };
    /** Context rebuilt from DB-resolved values (safe to hand to integrations). */
    trustedContext: ATSContext;
}

/**
 * Create an in-app notification for a user involved in an automation action.
 * Best-effort: failures are logged and never block the action.
 */
async function notifyAutomationUser(
    orgId: string,
    userId: string,
    userName: string,
    title: string,
    body: string,
    link?: string,
) {
    try {
        const { create_notifications_db } = await import(
            "@/server/queries/mongo/notifications"
        );
        await create_notifications_db(orgId, [userId], {
            kind: "automation",
            title,
            body,
            link,
            actor_id: "system",
            actor_name: "Automation",
        });
        console.log(`[AutomationEngine] notification → ${userName} (${userId}): "${title}"`);
    } catch (error) {
        console.warn("[AutomationEngine] Failed to create notification", error);
    }
}

/**
 * Resolve the automation target from the database. The org comes from the
 * (already trusted) context; the application id comes from the event, with
 * the legacy `context.settings.applicationId` as fallback. The candidate
 * and job are loaded from the DB — never taken from the caller. Throws
 * when the application doesn't exist in this org, doesn't belong to the
 * caller's job, or the event's candidate doesn't match the application.
 */
async function resolveAutomationTarget(
    orgId: string,
    event: TriggerEvent,
    context: ATSContext,
): Promise<ResolvedAutomationTarget> {
    const rawApplicationId =
        event.applicationId ??
        (context.settings?.applicationId as number | string | undefined);
    const applicationId = Number(rawApplicationId);
    if (!applicationId) {
        throw new Error("Cannot run automation action: no application ID in event");
    }

    const { assertApplicationBelongsToOrg } = await import("@/server/permissions");
    const application = await assertApplicationBelongsToOrg(applicationId, orgId);

    // An application always has a candidate and a job — fail closed if not.
    if (!application.candidate_id) {
        throw new Error("Cannot run automation action: application has no candidate");
    }
    if (!application.job_id) {
        throw new Error("Cannot run automation action: application has no job");
    }

    // The caller may name a job — it must be the application's job.
    if (context.job?.job_id && context.job.job_id !== application.job_id) {
        throw new Error("Cannot run automation action: application does not belong to the given job");
    }

    // The event's candidate must be the application's candidate.
    const eventCandidateId = Number(event.candidateId);
    if (eventCandidateId && eventCandidateId !== application.candidate_id) {
        throw new Error("Cannot run automation action: event candidate does not match the application");
    }

    const { db } = await import("@/drizzle/db");
    const { candidates, departments, job_listings } = await import("@/drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const [candidate] = await db
        .select({ id: candidates.id, name: candidates.name, email: candidates.email })
        .from(candidates)
        .where(eq(candidates.id, application.candidate_id))
        .limit(1);
    if (!candidate) {
        throw new Error("Cannot run automation action: candidate not found");
    }

    const [job] = await db
        .select({
            job_id: job_listings.id,
            job_name: job_listings.name,
            department_id: job_listings.department,
        })
        .from(job_listings)
        .where(eq(job_listings.id, application.job_id))
        .limit(1);
    if (!job) {
        throw new Error("Cannot run automation action: job not found");
    }

    let jobDepartment = context.job?.job_department ?? "";
    if (job.department_id) {
        const [department] = await db
            .select({ name: departments.name })
            .from(departments)
            .where(eq(departments.id, job.department_id))
            .limit(1);
        if (department) jobDepartment = department.name;
    }

    const trustedContext: ATSContext = {
        organization_id: orgId,
        user_id: context.user_id,
        candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
        job: { job_id: job.job_id, job_name: job.job_name, job_department: jobDepartment },
        settings: { ...(context.settings ?? {}) },
    };

    return {
        orgId,
        userId: context.user_id,
        applicationId,
        candidateId: application.candidate_id,
        candidate,
        job: { job_id: job.job_id, job_name: job.job_name, job_department: jobDepartment },
        trustedContext,
    };
}

/** Org's Resend plugin settings (decrypted server-side), for email sends. */
async function getOrgResendSettings(orgId: string) {
    const { db_get_organization_plugins } = await import(
        "@/server/queries/drizzle/plugin-queries"
    );
    const plugins = await db_get_organization_plugins(orgId);
    const resendSettings = plugins.settings?.["resend"];
    return {
        apiKey: resendSettings?.credentials?.apiKey as string | undefined,
        fromAddress: resendSettings?.config?.fromAddress as string | undefined,
        companyName: resendSettings?.config?.companyName as string | undefined,
        recruiterEmail: resendSettings?.config?.recruiterEmail as string | undefined,
        hiringManagerEmail: resendSettings?.config?.hiringManagerEmail as string | undefined,
    };
}

/**
 * Execute a single automation action against a DB-resolved target.
 * The caller must supply an org-bound context: the session org (server
 * action path) or the queue-verified org (worker path). Never call this
 * with a client-built context.
 */
export async function executeActionInternal(
    action: AutomationAction,
    event: TriggerEvent,
    context: ATSContext,
    opts: AutomationExecutorOptions = {},
): Promise<unknown> {
    const orgId = context.organization_id;
    if (!orgId) {
        throw new Error("Cannot run automation action: no organization in context");
    }

    const target = await resolveAutomationTarget(orgId, event, context);
    const trustedContext = target.trustedContext;

    // Build interpolation vars from DB-resolved values, never caller claims.
    const vars: Record<string, string> = {
        "candidate.name": target.candidate.name ?? "",
        "candidate.email": target.candidate.email ?? "",
        "candidate.id": target.candidate.id.toString(),
        "job.title": target.job.job_name ?? "",
        "job.department": target.job.job_department ?? "",
        "org.id": orgId,
        "stage": "toStage" in event ? event.toStage : "",
    };

    switch (action.type) {
        case "add_note": {
            const content = interpolate(action.content, vars);

            // Worker-safe note creation: no Clerk auth() — the caller is
            // already authorized, and the candidate/org binding was verified
            // above. The actor is the session user, or "system" (Automation)
            // for worker jobs.
            const { create_note_record } = await import("@/server/queries/mongo/note-core");
            await create_note_record({
                orgId,
                userId: target.userId,
                data: {
                    text: content,
                    note_id: `candidate_${target.candidateId}`,
                    note_type: "candidate",
                    candidate_id: target.candidateId,
                    type: "NEUTRAL",
                    mentions: [],
                },
            });

            console.log(`[AutomationEngine] add_note → candidate ${target.candidateId}: "${content.slice(0, 60)}…"`);
            return { candidateId: target.candidateId, content, pinned: action.pinned };
        }

        case "send_sms": {
            // No SMS provider (e.g. Twilio) is configured in this project yet.
            // Log the intended message so it can be audited, and return a stub
            // result so the automation rule still counts as executed.
            const message = interpolate(action.message, vars);
            console.warn(
                `[AutomationEngine] send_sms (NOT SENT — no SMS provider configured) → ${action.to}: "${message.slice(0, 60)}…"`,
            );
            return {
                to: action.to,
                message,
                status: "skipped",
                reason: "No SMS provider (Twilio) configured",
            };
        }

        case "send_email": {
            const subject = interpolate(action.subject, vars);
            const body = interpolate(action.body, vars);

            const resend = await getOrgResendSettings(orgId);
            const toEmail =
                action.to === "candidate" ? target.candidate.email :
                    action.to === "recruiter" ? (resend.recruiterEmail ?? (context.settings?.recruiterEmail as string | undefined)) :
                    (resend.hiringManagerEmail ?? (context.settings?.hiringManagerEmail as string | undefined));

            if (!toEmail) {
                throw new Error(`Cannot send email: no recipient email for "${action.to}"`);
            }

            // Resolve the org's Resend API key from plugin settings, falling back
            // to the environment variable. If no key is available at all, skip
            // gracefully in dev (matching the communication-log behaviour).
            const apiKey = resend.apiKey || process.env.RESEND_API_KEY;

            const fromAddress =
                resend.fromAddress ||
                process.env.RESEND_FROM_EMAIL ||
                "recruiting@aplico.online";
            const companyName =
                resend.companyName ||
                process.env.COMPANY_NAME ||
                "Talent Team";

            if (!apiKey) {
                if (process.env.NODE_ENV === "production") {
                    throw new Error("No Resend API key configured for email delivery");
                }
                // Dev mode: log and skip gracefully
                console.warn(
                    `[AutomationEngine] send_email (DEV — no API key) → ${toEmail}: "${subject}"`,
                );
                return {
                    to: toEmail,
                    subject,
                    status: "skipped",
                    reason: "No Resend API key configured (dev mode)",
                };
            }

            const { sendEmail } = await import("@/lib/resend");
            const html = body
                .split("\n")
                .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${line || "&nbsp;"}</p>`)
                .join("");

            const { id: emailId } = await sendEmail({
                apiKey,
                from: `${companyName} <${fromAddress}>`,
                to: toEmail,
                subject,
                html,
                tags: [
                    { name: "event", value: "automation_email" },
                    { name: "org", value: orgId },
                ],
            });

            console.log(`[AutomationEngine] send_email → ${toEmail}: "${subject}" (id: ${emailId})`);

            // If the email is sent to a recruiter or hiring manager (internal
            // coworker), create an in-app notification so they are aware.
            if (action.to === "recruiter" || action.to === "hiring_manager") {
                // Try to resolve the user ID from the email address
                try {
                    const { db_get_org_members } = await import(
                        "@/server/queries/drizzle/organization"
                    );
                    const members = await db_get_org_members(orgId);
                    const member = members.find((m) => m.email === toEmail);
                    if (member) {
                        await notifyAutomationUser(
                            orgId,
                            member.id,
                            member.name,
                            `Automation email: ${target.candidate.name}`,
                            `An automated email was sent about ${target.candidate.name} for ${target.job.job_name}: "${subject}"`,
                            `/jobs/${target.job.job_id}?tab=pipelines`,
                        );
                    }
                } catch (error) {
                    console.warn("[AutomationEngine] Failed to resolve user for email notification", error);
                }
            }

            return { emailId, to: toEmail, subject };
        }

        case "fire_integration": {
            // Use the caller's org-bound registry (worker) or build a fresh
            // per-org one (server action). The shared client singleton is
            // never used here — it may hold another org's providers.
            const registry = opts.registry ?? (await (async () => {
                const { initializePluginSystemServer } = await import("./initialize-plugins.server");
                return initializePluginSystemServer(orgId);
            })());
            const integration = registry.getIntegration(action.providerId, action.integrationId);
            if (!integration) {
                throw new Error(`Integration ${action.providerId}:${action.integrationId} not found`);
            }
            const result = await integration.execute(event, trustedContext);
            console.log(`[AutomationEngine] fire_integration → ${action.providerId}:${action.integrationId}`);
            return result;
        }

        case "move_stage": {
            // Look up the target stage by name for this job, then update the
            // application's current_stage_id directly in PostgreSQL.
            const { db } = await import("@/drizzle/db");
            const { applications, stages } = await import("@/drizzle/schema");
            const { eq, and } = await import("drizzle-orm");

            const jobId = target.job.job_id;

            // Find the stage row matching the target stage name + job
            const [targetStage] = await db
                .select()
                .from(stages)
                .where(
                    and(
                        eq(stages.stage_name, action.toStage as typeof import("@/zod").JOB_STAGES._type),
                        eq(stages.job_id, jobId),
                    ),
                )
                .limit(1);

            if (!targetStage) {
                throw new Error(`Stage "${action.toStage}" not found for job ${jobId}`);
            }

            // Update the application's stage. The where clause re-asserts
            // application + job + org (all DB-resolved above) so a stale or
            // mismatched id can never move another org's application.
            await db
                .update(applications)
                .set({ current_stage_id: targetStage.id })
                .where(
                    and(
                        eq(applications.id, target.applicationId),
                        eq(applications.job_id, jobId),
                        eq(applications.organization, orgId),
                    ),
                );

            // Verify the move actually applied — a miss must not report success.
            const [moved] = await db
                .select({ current_stage_id: applications.current_stage_id })
                .from(applications)
                .where(eq(applications.id, target.applicationId))
                .limit(1);
            if (!moved || moved.current_stage_id !== targetStage.id) {
                throw new Error(`Failed to move application ${target.applicationId} to stage "${action.toStage}"`);
            }

            // Revalidate the applications cache so the Kanban board reflects the change
            const { CACHE_TAGS, revalidateDbCache } = await import("@/lib/cache");
            revalidateDbCache({
                tag: CACHE_TAGS.applications,
                id: String(target.applicationId),
                orgId,
            });

            console.log(`[AutomationEngine] move_stage → application ${target.applicationId} → ${action.toStage} (stage ${targetStage.id})`);
            return { applicationId: target.applicationId, toStage: action.toStage, stageId: targetStage.id };
        }

        case "assign_recruiter": {
            // The applications table does not have a recruiter/assignee column yet.
            // Log the intended assignment so it can be audited once the schema
            // is extended. However, we still notify the assigned user so they
            // are aware of the automation-triggered assignment.
            console.warn(
                `[AutomationEngine] assign_recruiter (NOT APPLIED — no recruiter column in DB) → ${action.userId}`,
            );

            // Notify the assigned recruiter about the automation action
            await notifyAutomationUser(
                orgId,
                action.userId,
                action.userId,
                `You were assigned to ${target.candidate.name}`,
                `An automation rule assigned you to ${target.candidate.name} for ${target.job.job_name}.`,
                `/jobs/${target.job.job_id}?tab=pipelines`,
            );

            return {
                userId: action.userId,
                status: "skipped",
                reason: "No recruiter/assignee column in applications table",
            };
        }

        default:
            throw new Error(`Unknown action type: ${(action as AutomationAction).type}`);
    }
}
