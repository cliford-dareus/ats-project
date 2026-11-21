import { db } from "@/drizzle/db";
import { eq, inArray } from "drizzle-orm";
import {
    applications,
    attachments,
    automation_rules,
    candidates,
    interviews,
    job_listings,
    job_technologies,
    org_to_department,
    organization,
    organization_member,
    score_cards,
    stages,
} from "@/drizzle/schema";
import { revalidateDbCache } from "@/lib/cache";
import mongodb from "@/lib/mongodb";
import Attachment from "@/models/attachments";
import CandidateDetails from "@/models/candidate-details";
import CommunicationLog from "@/models/communication-log";
import EmailTemplate from "@/models/email-templates";
import Note from "@/models/notes";
import Thread from "@/models/threads";

export interface OrganizationDeletionCounts {
    // Drizzle (MySQL) tables, in delete order.
    score_cards: number;
    interviews: number;
    applications: number;
    job_technologies: number;
    automation_rules: number;
    stages: number;
    attachments: number;
    job_listings: number;
    candidates: number;
    org_to_department: number;
    organization_member: number;
    organization: number;
    // Mongo collections.
    candidate_details: number;
    mongo_attachments: number;
    notes: number;
    threads: number;
    communication_logs: number;
    email_templates: number;
}

/**
 * Fully remove one organization's data after Clerk deletes the org.
 *
 * Called from the `organization.deleted` Clerk webhook with the org id from
 * the verified Svix payload. Every delete is scoped to that org id, so other
 * orgs' data is never touched.
 *
 * What is deleted:
 * - Drizzle: score_cards, interviews, applications, job_technologies,
 *   automation_rules, stages, attachments, job_listings, candidates,
 *   org_to_department, organization_member, then the organization row.
 *   Deletes run in one transaction, ordered so foreign keys are respected:
 *   applications must go before job_listings/stages/candidates because
 *   applications.job_id and applications.current_stage_id have no
 *   ON DELETE CASCADE, and org_to_department must go before organization
 *   because its FK has no cascade either. Children with cascades
 *   (score_cards, job_technologies, stages, attachments) are still deleted
 *   explicitly so the counts are exact.
 * - Mongo: CandidateDetails (via candidate_id), Attachment (via organization_id, plus candidate_id for
 *   legacy docs created before organization_id was stamped), Note, Thread,
 *   CommunicationLog and EmailTemplate (via organization_id / organizationId).
 *
 * Deliberately NOT deleted — shared/global data, not org-owned:
 * - departments / technologies: global lookup tables; only the org's
 *   org_to_department links and job_technologies links are removed.
 * - users_table: a user can belong to several orgs; only their
 *   organization_member rows for this org are removed.
 *
 * The deletes are idempotent (re-running after a partial failure just
 * deletes 0 rows), so if this throws the Clerk webhook retry is safe.
 * On success the org's cached query tags are revalidated.
 */
export const delete_organization_data = async (
    organization_id: string,
): Promise<OrganizationDeletionCounts> => {
    // ── MySQL: collect the org's ids, then delete in FK-safe order ──────────
    const { counts, candidate_ids, application_ids } = await db.transaction(
        async (trx) => {
            const job_rows = await trx
                .select({ id: job_listings.id })
                .from(job_listings)
                .where(eq(job_listings.organization, organization_id));
            const job_ids = job_rows.map((row) => row.id);

            const candidate_rows = await trx
                .select({ id: candidates.id })
                .from(candidates)
                .where(eq(candidates.organization, organization_id));
            const candidate_ids = candidate_rows.map((row) => row.id);

            const application_rows = await trx
                .select({ id: applications.id })
                .from(applications)
                .where(eq(applications.organization, organization_id));
            const application_ids = application_rows.map((row) => row.id);

            const interview_rows = await trx
                .select({ id: interviews.id })
                .from(interviews)
                .where(eq(interviews.organization, organization_id));
            const interview_ids = interview_rows.map((row) => row.id);

            const counts: Omit<
                OrganizationDeletionCounts,
                | "candidate_details"
                | "mongo_attachments"
                | "notes"
                | "threads"
                | "communication_logs"
                | "email_templates"
            > = {
                score_cards: 0,
                interviews: 0,
                applications: 0,
                job_technologies: 0,
                automation_rules: 0,
                stages: 0,
                attachments: 0,
                job_listings: 0,
                candidates: 0,
                org_to_department: 0,
                organization_member: 0,
                organization: 0,
            };

            // 1. Score cards (FK interviews_id -> interviews.id).
            if (interview_ids.length > 0) {
                const [result] = await trx
                    .delete(score_cards)
                    .where(inArray(score_cards.interviews_id, interview_ids));
                counts.score_cards = result.affectedRows;
            }

            // 2. Interviews (org-scoped; also cascade from applications).
            const [interviews_result] = await trx
                .delete(interviews)
                .where(eq(interviews.organization, organization_id));
            counts.interviews = interviews_result.affectedRows;

            // 3. Applications — BEFORE jobs, stages and candidates: their
            // job_id / current_stage_id FKs have no ON DELETE CASCADE.
            const [applications_result] = await trx
                .delete(applications)
                .where(eq(applications.organization, organization_id));
            counts.applications = applications_result.affectedRows;

            // 4. Job <-> technology links.
            if (job_ids.length > 0) {
                const [result] = await trx
                    .delete(job_technologies)
                    .where(inArray(job_technologies.job_id, job_ids));
                counts.job_technologies = result.affectedRows;
            }

            // 5. Automation rules for the org.
            const [automation_result] = await trx
                .delete(automation_rules)
                .where(eq(automation_rules.org_id, organization_id));
            counts.automation_rules = automation_result.affectedRows;

            // 6. Pipeline stages (FK job_id -> job_listings.id).
            if (job_ids.length > 0) {
                const [result] = await trx
                    .delete(stages)
                    .where(inArray(stages.job_id, job_ids));
                counts.stages = result.affectedRows;
            }

            // 7. Attachments (FK candidate_id -> candidates.id).
            if (candidate_ids.length > 0) {
                const [result] = await trx
                    .delete(attachments)
                    .where(inArray(attachments.candidate_id, candidate_ids));
                counts.attachments = result.affectedRows;
            }

            // 8. Job listings.
            const [jobs_result] = await trx
                .delete(job_listings)
                .where(eq(job_listings.organization, organization_id));
            counts.job_listings = jobs_result.affectedRows;

            // 9. Candidates.
            const [candidates_result] = await trx
                .delete(candidates)
                .where(eq(candidates.organization, organization_id));
            counts.candidates = candidates_result.affectedRows;

            // 10. Org <-> department links — BEFORE organization: this FK
            // has no ON DELETE CASCADE.
            const [org_dept_result] = await trx
                .delete(org_to_department)
                .where(eq(org_to_department.organization_id, organization_id));
            counts.org_to_department = org_dept_result.affectedRows;

            // 11. Org memberships.
            const [members_result] = await trx
                .delete(organization_member)
                .where(eq(organization_member.organization_id, organization_id));
            counts.organization_member = members_result.affectedRows;

            // 12. The organization row itself.
            const [org_result] = await trx
                .delete(organization)
                .where(eq(organization.clerk_id, organization_id));
            counts.organization = org_result.affectedRows;

            return { counts, candidate_ids, application_ids };
        },
    );

    // ── Mongo: org-scoped collections (no FKs, order does not matter) ───────
    await mongodb();

    // Candidate details are keyed only by candidate_id.
    const candidate_details_deleted =
        candidate_ids.length > 0
            ? (
                  await CandidateDetails.deleteMany({
                      candidate_id: { $in: candidate_ids },
                  })
              ).deletedCount ?? 0
            : 0;

    // Attachments carry organization_id, but docs created before that field
    // was stamped only have candidate_id — match both so none are orphaned.
    const mongo_attachments_deleted = (
        await Attachment.deleteMany(
            candidate_ids.length > 0
                ? {
                      $or: [
                          { organization_id },
                          { candidate_id: { $in: candidate_ids } },
                      ],
                  }
                : { organization_id },
        )
    ).deletedCount ?? 0;

    const notes_deleted = (
        await Note.deleteMany({ organization_id })
    ).deletedCount ?? 0;

    const threads_deleted = (
        await Thread.deleteMany({ organization_id })
    ).deletedCount ?? 0;

    const communication_logs_deleted = (
        await CommunicationLog.deleteMany({ organizationId: organization_id })
    ).deletedCount ?? 0;

    const email_templates_deleted = (
        await EmailTemplate.deleteMany({ organizationId: organization_id })
    ).deletedCount ?? 0;

    const full_counts: OrganizationDeletionCounts = {
        ...counts,
        candidate_details: candidate_details_deleted,
        mongo_attachments: mongo_attachments_deleted,
        notes: notes_deleted,
        threads: threads_deleted,
        communication_logs: communication_logs_deleted,
        email_templates: email_templates_deleted,
    };

    console.log("[clerk webhook] organization.deleted: removed org data", {
        organization_id,
        ...full_counts,
    });

    // Drop anything cached under this org so stale org data is never served.
    revalidateDbCache({
        tag: "organizations",
        id: organization_id,
        orgId: organization_id,
    });
    revalidateDbCache({ tag: "jobs", orgId: organization_id });
    revalidateDbCache({ tag: "candidates", orgId: organization_id });
    revalidateDbCache({ tag: "applications", orgId: organization_id });
    revalidateDbCache({ tag: "stages", orgId: organization_id });
    revalidateDbCache({ tag: "departments", orgId: organization_id });
    revalidateDbCache({ tag: "chartData", orgId: organization_id });

    return full_counts;
};
