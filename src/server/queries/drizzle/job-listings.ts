import {
    applications,
    attachments,
    candidates, departments,
    interviews,
    job_listings,
    job_technologies,
    organization,
    stages,
    technologies,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import {
    CACHE_TAGS,
    dbCache,
    getGlobalTag,
    getIdTag,
    getOrgTag,
    revalidateDbCache,
} from "@/lib/cache";
import { z } from "zod";
import { filterJobSchema, JOB_STAGES, jobFormSchema, updateJobListingSchema } from "@/zod";
import { ApplicationType, CandidateType, InterviewType, JobListingType } from "@/types";

type Technology = typeof technologies.$inferSelect;

// Stage names the system always inserts itself. Custom stages picked by
// the user that duplicate one of these (or each other) would collide with
// the unique (job_id, stage_name) index and fail the whole job creation,
// so they are skipped here — and the stage picker no longer offers them.
const SYSTEM_STAGE_NAMES = new Set(["Applied", "Drafted"]);

const dedupeCustomStages = <T extends { stage_name: string }>(customStages: T[]): T[] => {
    const seen = new Set<string>(SYSTEM_STAGE_NAMES);
    return customStages.filter((stage) => {
        if (seen.has(stage.stage_name)) return false;
        seen.add(stage.stage_name);
        return true;
    });
};

// The transaction object type, inferred from db.transaction so the helpers
// below stay typed without importing drizzle internals.
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DraftTech = { technology: string; year_of_experience: string };
type DraftStage = {
    stage_name: z.infer<typeof JOB_STAGES>;
    stage_assign_to: string;
    color: string;
    // Always a plain boolean in wizard-shaped data (the draft loader
    // coalesces null to false); kept optional to match the form schema.
    need_schedule?: boolean;
};

// Replace a job's technologies wholesale (links are deleted, then fresh
// technology rows + links are inserted — the same pattern create uses).
const replaceJobTechnologies = async (trx: DbTx, jobId: number, techs: DraftTech[]) => {
    await trx.delete(job_technologies).where(eq(job_technologies.job_id, jobId));
    if (techs.length === 0) return;
    const inserted = await trx
        .insert(technologies)
        .values(
            techs.map((item) => ({
                name: item.technology,
                years_experience: Number(item.year_of_experience),
            })),
        )
        .$returningId();
    for (const tech of inserted) {
        await trx.insert(job_technologies).values({
            id: tech.id * 2,
            job_id: jobId,
            technology_id: tech.id,
        });
    }
};

// Replace a job's stages wholesale: the two system stages first, then the
// user's (deduped) custom stages. Only ever used on DRAFT rows — a live
// job's stages may already carry applications.
const replaceJobStages = async (trx: DbTx, jobId: number, userId: string, customStages: DraftStage[]) => {
    await trx.delete(stages).where(eq(stages.job_id, jobId));
    await trx.insert(stages).values([
        {
            job_id: jobId,
            stage_name: 'Applied',
            stage_order_id: 0,
            assign_to: userId,
            need_schedule: false,
            color: '#a21caf',
        },
        {
            job_id: jobId,
            stage_name: 'Drafted',
            stage_order_id: 1,
            assign_to: userId,
            need_schedule: false,
            color: '#52525b',
        },
        ...dedupeCustomStages(customStages).map((item, i) => ({
            job_id: jobId,
            stage_name: item.stage_name,
            stage_order_id: i + 2,
            assign_to: String(item.stage_assign_to),
            need_schedule: item.need_schedule ?? false,
            color: item.color,
        })),
    ]);
};

// The job row a draft update is allowed to touch: it must belong to the
// org and still be a DRAFT. Anything else is refused, so a draft id can
// never be used to rewrite a live job.
const assertDraftRow = async (trx: DbTx, jobId: number, orgId: string) => {
    const [row] = await trx
        .select({ id: job_listings.id })
        .from(job_listings)
        .where(and(
            eq(job_listings.id, jobId),
            eq(job_listings.organization, orgId),
            eq(job_listings.status, "DRAFT"),
        ))
        .limit(1);
    if (!row) {
        throw new Error("Draft job not found");
    }
    return row;
};

const revalidateJob = (jobId: number, orgId: string) => {
    revalidateDbCache({
        tag: CACHE_TAGS.jobs,
        id: String(jobId),
        orgId,
    });
};

interface FilterInterface extends z.infer<typeof filterJobSchema> {
    organization: string;
};

export const create_job_listing = async (
    data: z.infer<typeof jobFormSchema>,
    opts?: { status?: "OPEN" | "CLOSED" | "DRAFT" | "ARCHIVED" | "PENDING" }
) => {
    return await db.transaction(async (trx) => {
        // Resolve the org's subdomain from its Clerk id — never hardcode it
        // (every job previously got subdomain "bridge" regardless of org).
        const [org] = await trx
            .select({ subdomain: organization.subdomain })
            .from(organization)
            .where(eq(organization.clerk_id, data.jobInfo.organization))
            .limit(1);
        if (!org) {
            throw new Error("Organization not found for job creation");
        }

        // ── Job ──────────────────────────────────────────────────────────────
        const [inserted_job] = await trx
            .insert(job_listings)
            .values({
                name: data.jobInfo.job_name,
                location: data.jobInfo.job_location,
                salary_up_to: data.jobInfo.salary_up_to,
                salary_from: data.jobInfo.salary_from || null,
                type: data.jobInfo.job_type,
                created_by: String(data.userId),
                description: data.jobInfo.job_description,
                department: Number(data.jobInfo.department),
                organization: data.jobInfo.organization,
                subdomain: org.subdomain,
                ...(opts?.status ? { status: opts.status } : {}),
            })
            .$returningId();

        if (!inserted_job) return trx.rollback();

        // ── Technologies ──────────────────────────────────────────────────────
        await replaceJobTechnologies(trx, inserted_job.id, data.jobTechnology);

        // ── Stages ────────────────────────────────────────────────────────────
        await replaceJobStages(trx, inserted_job.id, String(data.userId), data.jobStages);

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            id: String(inserted_job.id),
            orgId: String(data.jobInfo.organization),
        });

        return inserted_job;
    });
};

// ── Draft persistence (job wizard) ────────────────────────────────────────
// The wizard keeps its in-progress job as a DRAFT row so progress survives
// refresh, browser switch, and logout. Every function below only touches a
// row that belongs to the org and is still a DRAFT — a draft id can never
// be used to rewrite a live job.

export const update_job_draft_info = async (
    jobId: number,
    orgId: string,
    jobInfo: z.infer<typeof jobFormSchema>["jobInfo"],
) => {
    await db.transaction(async (trx) => {
        await assertDraftRow(trx, jobId, orgId);
        await trx
            .update(job_listings)
            .set({
                name: jobInfo.job_name,
                location: jobInfo.job_location,
                description: jobInfo.job_description,
                department: Number(jobInfo.department),
                type: jobInfo.job_type,
                salary_up_to: jobInfo.salary_up_to,
                salary_from: jobInfo.salary_from || null,
            })
            .where(eq(job_listings.id, jobId));
    });
    revalidateJob(jobId, orgId);
};

export const update_job_draft_technologies = async (
    jobId: number,
    orgId: string,
    techs: DraftTech[],
) => {
    await db.transaction(async (trx) => {
        await assertDraftRow(trx, jobId, orgId);
        await replaceJobTechnologies(trx, jobId, techs);
    });
    revalidateJob(jobId, orgId);
};

export const update_job_draft_stages = async (
    jobId: number,
    orgId: string,
    userId: string,
    customStages: DraftStage[],
) => {
    await db.transaction(async (trx) => {
        await assertDraftRow(trx, jobId, orgId);
        await replaceJobStages(trx, jobId, userId, customStages);
    });
    revalidateJob(jobId, orgId);
};

// Publish a draft: final data + status OPEN, in one transaction. Returns
// the job id. Throws when the row is not an org DRAFT.
export const publish_job_draft = async (
    jobId: number,
    orgId: string,
    data: z.infer<typeof jobFormSchema>,
) => {
    await db.transaction(async (trx) => {
        await assertDraftRow(trx, jobId, orgId);
        await trx
            .update(job_listings)
            .set({
                name: data.jobInfo.job_name,
                location: data.jobInfo.job_location,
                description: data.jobInfo.job_description,
                department: Number(data.jobInfo.department),
                type: data.jobInfo.job_type,
                salary_up_to: data.jobInfo.salary_up_to,
                salary_from: data.jobInfo.salary_from || null,
                status: "OPEN",
            })
            .where(eq(job_listings.id, jobId));
        await replaceJobTechnologies(trx, jobId, data.jobTechnology);
        await replaceJobStages(trx, jobId, String(data.userId), data.jobStages);
    });
    revalidateJob(jobId, orgId);
    return jobId;
};

export type WizardDraft = {
    draftId: number;
    jobInfo: z.infer<typeof jobFormSchema>["jobInfo"];
    jobTechnology: DraftTech[];
    jobStages: DraftStage[];
};

// Load a DRAFT row shaped for the wizard provider, or null when it isn't
// an org DRAFT. System stages (Applied/Drafted) are omitted — the wizard
// re-adds them on publish.
export const get_job_draft_for_wizard = async (jobId: number, orgId: string): Promise<WizardDraft | null> => {
    const [job] = await db
        .select()
        .from(job_listings)
        .where(and(
            eq(job_listings.id, jobId),
            eq(job_listings.organization, orgId),
            eq(job_listings.status, "DRAFT"),
        ))
        .limit(1);
    if (!job) return null;

    const techRows = await db
        .select({ name: technologies.name, years_experience: technologies.years_experience })
        .from(job_technologies)
        .innerJoin(technologies, eq(technologies.id, job_technologies.technology_id))
        .where(eq(job_technologies.job_id, jobId));

    const stageRows = await db
        .select()
        .from(stages)
        .where(eq(stages.job_id, jobId))
        .orderBy(stages.stage_order_id);

    return {
        draftId: job.id,
        jobInfo: {
            job_name: job.name,
            job_description: job.description,
            job_location: job.location,
            department: String(job.department),
            job_type: job.type ?? "FULL_TIME",
            organization: job.organization,
            salary_up_to: job.salary_up_to ?? "",
            salary_from: job.salary_from ?? "",
        },
        jobTechnology: techRows.map((t) => ({
            technology: t.name,
            year_of_experience: String(t.years_experience ?? ""),
        })),
        jobStages: stageRows
            .filter((s) => s.stage_name !== null && !SYSTEM_STAGE_NAMES.has(s.stage_name))
            .map((s) => ({
                stage_name: s.stage_name as z.infer<typeof JOB_STAGES>,
                stage_assign_to: s.assign_to ?? "",
                color: s.color ?? "#3B82F6",
                need_schedule: s.need_schedule ?? false,
            })),
    };
};

export const update_job_listing = async (data: z.infer<typeof updateJobListingSchema>) => {
    let department_id = null;

    if (data.department) {
        const department = await db
            .select()
            .from(departments)
            .where(eq(departments.name, data.department))
            .limit(1);
        if (department.length > 0) {
            department_id = department[0].id;
        }
    }

    await db
        .update(job_listings)
        .set({
            ...(data.name && { name: data.name }),
            ...(data.description && { description: data.description }),
            ...(data.location && { location: data.location }),
            ...(data.status && { status: data.status }),
            ...(department_id !== null && { department_id: department_id }),
            ...(data.organization && { organization: data.organization }),
            ...(data.salary_up_to && { salary_up_to: data.salary_up_to }),
            ...(data.salary_from !== undefined && { salary_from: data.salary_from || null }),
            ...(data.type && { type: data.type }),
        })
        .where(eq(job_listings.id, data.jobId));

    revalidateDbCache({
        tag: CACHE_TAGS.jobs,
        id: String(data.jobId),
        orgId: String(data.organization)
    });
};

export const delete_job_listing = async (jobId: number, orgId: string) => {
    await db
        .delete(job_listings)
        .where(eq(job_listings.id, jobId));

    revalidateDbCache({ tag: CACHE_TAGS.jobs, id: String(jobId), orgId: orgId });
};

export const get_job_listings_stages = (jobId: number) => {
    const cacheFn = dbCache(get_job_listings_stages_db, {
        tags: [getIdTag(String(jobId), CACHE_TAGS.stages)],
    });

    return cacheFn(jobId);
};

export const get_all_job_listings = (filter: FilterInterface) => {
    const cacheFn = dbCache(get_all_job_listings_db, {
        keyParts: ["jobs", filter.organization, JSON.stringify(filter)],
        tags: [
            getOrgTag(filter.organization, CACHE_TAGS.jobs),
            getGlobalTag(CACHE_TAGS.jobs), // optional, for rare global flush
        ],
    })
    return cacheFn(filter)
};

export const get_job_by_id = (jobId: number, org_id: string) => {
    const cacheFn = dbCache(get_job_by_id_db, {
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.jobs),
            getOrgTag(org_id, CACHE_TAGS.jobs),
        ],
    });
    return cacheFn(jobId, org_id);
};

export const get_job_by_id_db = async (jobId: number, org_id: string): Promise<JobListingType[]> => {
    const rows = await db
        .select({
            jobListing: job_listings,
            department: departments,
            application: applications,
            experience: technologies,
            candidate: candidates,
            interview: interviews,
            attachment: attachments,
            stage: stages,
        })
        .from(job_listings)
        .leftJoin(applications, eq(applications.job_id, job_listings.id))
        .leftJoin(candidates, eq(candidates.id, applications.candidate))
        .leftJoin(departments, eq(departments.id, job_listings.department))
        .leftJoin(job_technologies, eq(job_listings.id, job_technologies.job_id))
        .leftJoin(technologies, eq(job_technologies.technology_id, technologies.id))
        .leftJoin(attachments, eq(candidates.id, attachments.candidate_id))
        .leftJoin(interviews, eq(applications.id, interviews.applications_id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(
            eq(job_listings.id, jobId),
            eq(job_listings.organization, org_id)
        ));

    if (rows.length === 0) return [];

    const firstRow = rows[0];
    const jobListing: JobListingType = {
        job_id: firstRow.jobListing.id,
        job_name: firstRow.jobListing.name,
        job_status: firstRow.jobListing.status,
        job_department: firstRow.department?.name ?? '',
        job_type: firstRow.jobListing.type,
        job_location: firstRow.jobListing.location,
        job_subdomain: firstRow.jobListing.subdomain,
        job_created_at: firstRow.jobListing.created_at,
        job_updated_at: firstRow.jobListing.updated_at,
        job_description: firstRow.jobListing.description,
        job_technologies: [],
        applications: [],
    };

    // ── Dedup maps ──────────────────────────────────────────────────────────────
    const technologyMap = new Map<number, Technology>();
    const applicationMap = new Map<number, ApplicationType>();
    // Per-application sets so interview dedup is O(1) not O(n)
    const interviewSets = new Map<number, Set<number>>();
    const attachmentSets = new Map<number, Set<number>>();


    for (const row of rows) {
        // ── Technologies ──────────────────────────────────────────────────────────
        if (row.experience?.id && !technologyMap.has(row.experience.id)) {
            technologyMap.set(row.experience.id, row.experience)
        }

        // ── Applications ──────────────────────────────────────────────────────────
        if (!row.application?.id) continue;
        let application = applicationMap.get(row.application.id);

        if (!application) {
            application = {
                id: row.application.id,
                job_id: row.jobListing.id,
                created_at: row.application.created_at,
                updated_at: row.application.updated_at,
                stage: row.stage?.stage_name ?? null,
                stage_order_id: row.stage?.stage_order_id ?? null,
                position_in_stage: row.application.position_in_stage ?? null,
                current_stage_id: row.stage?.id ?? null,
                organization: row.application.organization ?? null,
                // ApplicationType carries a single interview (the kanban card
                // and get_job_all_applications_db both treat it as singular);
                // the first joined row wins, same as the other query.
                interviews: null,
                attachments: [],

                // ── Resume score ─────────────────────────────────────────────────
                resume_score: row.application.resume_score ?? null,
                resume_score_fit: row.application.resume_score_fit ?? null,
                resume_score_skills: row.application.resume_score_skills ?? null,
                resume_score_exp: row.application.resume_score_exp ?? null,
                resume_score_summary: row.application.resume_score_summary ?? null,
                resume_scored_at: row.application.resume_scored_at ?? null,
                resume_score_model: row.application.resume_score_model ?? null,

                // ── Candidate ───────────────────────────────────────────────────
                candidate: row.candidate
                    ? {
                        id: row.candidate.id,
                        name: row.candidate.name,
                        email: row.candidate.email,
                        phone: row.candidate.phone,
                        cv_path: row.candidate.cv_path,
                        status: row.candidate.status,
                        created_at: row.candidate.created_at,
                        updated_at: row.candidate.updated_at,
                    }
                    : {} as unknown as CandidateType, // Candidate object or empty object
            };

            applicationMap.set(row.application.id, application);
            interviewSets.set(row.application.id, new Set());
            attachmentSets.set(row.application.id, new Set());
            jobListing.applications.push(application);
        };

        // ── Interviews (belong to application, not candidate) ─────────────────────
        // Singular on ApplicationType: keep the first interview for the
        // application. The row's applications_id maps to the DTO's
        // application_id; the rest of the columns line up with InterviewType.
        if (row.interview?.id) {
            const seen = interviewSets.get(row.application.id)!;
            if (!seen.has(row.interview.id)) {
                seen.add(row.interview.id);
                application.interviews ??= {
                    id: row.interview.id,
                    application_id: row.interview.applications_id,
                    start_at: row.interview.start_at,
                    end_at: row.interview.end_at,
                    locations: row.interview.locations,
                    type: row.interview.type,
                    status: row.interview.status,
                    link: row.interview.link,
                    hold_status: row.interview.hold_status,
                    hold_expires_at: row.interview.hold_expires_at,
                } satisfies InterviewType;
            }
        }

        // ── Attachments ───────────────────────────────────────────────────────────
        if (row.attachment?.id) {
            const seen = attachmentSets.get(row.application.id)!;
            if (!seen.has(row.attachment.id)) {
                seen.add(row.attachment.id);
                application.attachments.push(row.attachment);
            }
        }
    };

    jobListing.job_technologies = Array.from(technologyMap.values());
    return [jobListing];
};

export const get_all_job_listings_db = async (filter: FilterInterface) => {
    const filters: SQL[] = [];

    if (filter.keywords && filter.keywords.length > 0) {
        const keywordFilters = filter.keywords.map(keyword =>
            sql`${job_listings.name} LIKE ${`%${keyword}%`}`
        );
        filters.push(sql`(${sql.join(keywordFilters, sql` OR `)})`);
    }

    if (filter.location) {
        const locations = Array.isArray(filter.location) ? filter.location : [filter.location];
        filters.push(inArray(job_listings.location, locations));
    }

    if (filter.department) {
        filters.push(inArray(departments.name, filter.department));
    }

    if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        filters.push(inArray(job_listings.status, statuses));
    }

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(job_listings)
        .where(and(...filters, eq(job_listings.organization, filter.organization)));

    const jobListings = await db
        .select({
            id: job_listings.id,
            name: job_listings.name,
            location: job_listings.location,
            status: job_listings.status,
            department: departments.name,
            organization: job_listings.organization,
            type: job_listings.type,
            salary: job_listings.salary_up_to,
            salary_from: job_listings.salary_from,
            description: job_listings.description,
            created_at: job_listings.created_at,
            updated_at: job_listings.updated_at,
            createdBy: job_listings.created_by,
            application_count: db.$count(
                applications,
                eq(applications.job_id, job_listings.id),
            ),
        })
        .from(job_listings)
        .leftJoin(departments, eq(job_listings.department, departments.id))
        .where(and(...filters, eq(job_listings.organization, filter.organization)))
        .limit(filter.limit!)
        .offset(filter.offset!);

    return [count, jobListings];
};

export const get_job_listings_stages_db = async (jobId: number) => {
    return db
        .select({
            id: stages.id,
            assign_to: stages.assign_to,
            color: stages.color,
            job_id: stages.job_id,
            need_schedule: stages.need_schedule,
            stage_name: stages.stage_name,
            stage_order_id: stages.stage_order_id,
        })
        .from(stages)
        .where(eq(stages.job_id, jobId))
        .groupBy(stages.id);
};
