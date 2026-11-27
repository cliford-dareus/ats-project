// Server/worker-only interview reminder service. Deliberately NOT "use server".
//
// Sends the 24h reminder for confirmed/direct-scheduled interviews starting
// in the next 24h. reminder_sent_at is stamped ONLY after a successful
// candidate send, so failures stay null and are retried on the next sweep.

import { db_get_org_members_by_ids } from "@/server/queries/drizzle/organization";
import {
    get_due_interview_reminders_db,
    mark_reminder_sent_db,
} from "@/server/queries/drizzle/interview";
import { format_interview_time } from "@/server/holds/hold-service";
import {
    get_org_profile,
    render_org_template,
    send_org_email,
} from "@/server/email/org-mailer";

export type ReminderSweepResult = {
    sent: number;
    failed: number;
};

export async function send_interview_reminders(): Promise<ReminderSweepResult> {
    const due = await get_due_interview_reminders_db();
    let sent = 0;
    let failed = 0;

    for (const row of due) {
        try {
            if (!row.candidate_email) {
                console.warn(
                    `[reminders] Interview ${row.interview_id} has no candidate email; skipping.`
                );
                failed++;
                continue;
            }

            const org = await get_org_profile(row.organization);
            const companyName = org?.name ?? "Applico";
            const when = format_interview_time(row.start_at, row.end_at);
            const candidateFirstName =
                row.candidate_name?.split(" ")[0] ?? "there";

            // Candidate reminder (existing interview_reminder template).
            const rendered = await render_org_template(
                row.organization,
                "interview_reminder",
                {
                    candidateName: candidateFirstName,
                    jobTitle: row.job_name ?? "the role",
                    interviewDate: when,
                    companyName,
                }
            );
            const candidateResult = await send_org_email({
                orgId: row.organization,
                to: row.candidate_email,
                toName: row.candidate_name ?? undefined,
                subject: rendered.subject,
                text: rendered.text,
                type: "interview_reminder",
                templateId: rendered.templateId,
                candidateId: row.candidate_id ?? undefined,
            });

            if (!candidateResult.success) {
                console.error(
                    `[reminders] Candidate reminder failed for interview ${row.interview_id}: ${candidateResult.error}`
                );
                failed++;
                continue;
            }

            // Interviewer reminders (best-effort — they never block the
            // candidate reminder or the sent stamp). Same template, addressed
            // to each interviewer by first name so it reads as their own
            // reminder for this candidate's interview.
            const interviewer_ids = row.interviewer_ids ?? [];
            if (interviewer_ids.length > 0) {
                try {
                    const members = await db_get_org_members_by_ids(
                        row.organization,
                        interviewer_ids
                    );
                    for (const member of members) {
                        if (!member.email) continue;
                        try {
                            const interviewerRendered =
                                await render_org_template(
                                    row.organization,
                                    "interview_reminder",
                                    {
                                        candidateName:
                                            member.name?.split(" ")[0] ?? "there",
                                        jobTitle: row.job_name ?? "the role",
                                        interviewDate: when,
                                        companyName,
                                    }
                                );
                            await send_org_email({
                                orgId: row.organization,
                                to: member.email,
                                toName: member.name ?? undefined,
                                subject: interviewerRendered.subject,
                                text: interviewerRendered.text,
                                type: "interview_reminder",
                                templateId: interviewerRendered.templateId,
                                candidateId: row.candidate_id ?? undefined,
                            });
                        } catch (error) {
                            console.error(
                                `[reminders] Interviewer reminder failed for interview ${row.interview_id} (${member.email}):`,
                                error
                            );
                        }
                    }
                } catch (error) {
                    console.error(
                        `[reminders] Failed to resolve interviewers for interview ${row.interview_id}:`,
                        error
                    );
                }
            }

            // Only now — candidate send succeeded — is the reminder stamped,
            // so this interview is never reminded twice.
            await mark_reminder_sent_db(row.interview_id);
            sent++;
        } catch (error) {
            console.error(
                `[reminders] Reminder failed for interview ${row.interview_id}:`,
                error
            );
            failed++;
        }
    }

    return { sent, failed };
}
