"use server";
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-ONLY — Action handlers for the Automation Engine.
// This file imports server-only modules (DB, plugin encryption, etc.) and must
// NOT be imported directly by client components. It is loaded dynamically by
// `automation-engine.ts` only when an action actually executes.
// ─────────────────────────────────────────────────────────────────────────────
import type { AutomationAction, ATSContext, TriggerEvent } from "@/types";
import { interpolate } from "@/types";

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
 * Execute a single automation action. This function is meant to be called
 * only server-side (via dynamic import from the AutomationEngine).
 */
export async function executeAction(
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

    const candidateId = Number(event.candidateId);

    switch (action.type) {
        case "add_note": {
            const content = interpolate(action.content, vars);
            if (!candidateId) {
                throw new Error("Cannot add note: no candidate ID in event");
            }

            // Call the real note creation server action.
            // Notes are stored in MongoDB via the Note model, attached to the candidate.
            const { create_note } = await import("@/server/queries/mongo/note");
            const result = await create_note({
                text: content,
                note_id: `candidate_${candidateId}`,
                note_type: "candidate",
                candidate_id: candidateId,
                type: "NEUTRAL",
                mentions: [],
            });

            if (typeof result === "object" && result !== null && "error" in result && result.error) {
                throw new Error(`Failed to create note: ${result.message ?? "unknown error"}`);
            }

            console.log(`[AutomationEngine] add_note → candidate ${candidateId}: "${content.slice(0, 60)}…"`);
            return { candidateId, content, pinned: action.pinned };
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

            const toEmail =
                action.to === "candidate" ? context.candidate?.email :
                    action.to === "recruiter" ? (context.settings.recruiterEmail as string) :
                    (context.settings.hiringManagerEmail as string);

            if (!toEmail) {
                throw new Error(`Cannot send email: no recipient email for "${action.to}"`);
            }

            // Resolve the org's Resend API key from plugin settings, falling back
            // to the environment variable. If no key is available at all, skip
            // gracefully in dev (matching the communication-log behaviour).
            const { db_get_organization_plugins } = await import(
                "@/server/queries/drizzle/plugin-queries"
            );
            const plugins = await db_get_organization_plugins(context.organization_id);
            const resendSettings = plugins.settings?.["resend"];
            const apiKey = resendSettings?.credentials?.apiKey || process.env.RESEND_API_KEY;

            const fromAddress =
                (resendSettings?.config?.fromAddress as string | undefined) ||
                process.env.RESEND_FROM_EMAIL ||
                "recruiting@aplico.online";
            const companyName =
                (resendSettings?.config?.companyName as string | undefined) ||
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
                    { name: "org", value: context.organization_id },
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
                    const members = await db_get_org_members(context.organization_id);
                    const member = members.find((m) => m.email === toEmail);
                    if (member) {
                        const candidateName = context.candidate?.name ?? "a candidate";
                        const jobTitle = context.job?.job_name ?? "a job";
                        await notifyAutomationUser(
                            context.organization_id,
                            member.id,
                            member.name,
                            `Automation email: ${candidateName}`,
                            `An automated email was sent about ${candidateName} for ${jobTitle}: "${subject}"`,
                            candidateId ? `/jobs/${context.job?.job_id}?tab=pipelines` : undefined,
                        );
                    }
                } catch (error) {
                    console.warn("[AutomationEngine] Failed to resolve user for email notification", error);
                }
            }

            return { emailId, to: toEmail, subject };
        }

        case "fire_integration": {
            const { pluginRegistry } = await import("./plugin-registry");
            const integration = pluginRegistry.getIntegration(action.providerId, action.integrationId);
            if (!integration) {
                throw new Error(`Integration ${action.providerId}:${action.integrationId} not found`);
            }
            const result = await integration.execute(event, context);
            console.log(`[AutomationEngine] fire_integration → ${action.providerId}:${action.integrationId}`);
            return result;
        }

        case "move_stage": {
            if (!candidateId) {
                throw new Error("Cannot move stage: no candidate ID in event");
            }

            // Look up the target stage by name for this job, then update the
            // application's current_stage_id directly in PostgreSQL.
            const { db } = await import("@/drizzle/db");
            const { applications, stages } = await import("@/drizzle/schema");
            const { eq, and } = await import("drizzle-orm");

            const jobId = context.job?.job_id;
            if (!jobId) {
                throw new Error("Cannot move stage: no job ID in context");
            }

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

            // Update the application's stage
            await db
                .update(applications)
                .set({ current_stage_id: targetStage.id })
                .where(
                    and(
                        eq(applications.id, candidateId),
                        eq(applications.organization, context.organization_id),
                    ),
                );

            // Revalidate the applications cache so the Kanban board reflects the change
            const { CACHE_TAGS, revalidateDbCache } = await import("@/lib/cache");
            revalidateDbCache({
                tag: CACHE_TAGS.applications,
                id: String(candidateId),
                orgId: context.organization_id,
            });

            console.log(`[AutomationEngine] move_stage → application ${candidateId} → ${action.toStage} (stage ${targetStage.id})`);
            return { applicationId: candidateId, toStage: action.toStage, stageId: targetStage.id };
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
            const candidateName = context.candidate?.name ?? "a candidate";
            const jobTitle = context.job?.job_name ?? "a job";
            await notifyAutomationUser(
                context.organization_id,
                action.userId,
                action.userId,
                `You were assigned to ${candidateName}`,
                `An automation rule assigned you to ${candidateName} for ${jobTitle}.`,
                candidateId ? `/jobs/${context.job?.job_id}?tab=pipelines` : undefined,
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
