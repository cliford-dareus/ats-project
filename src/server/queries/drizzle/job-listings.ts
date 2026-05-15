import {
    applications,
    attachments,
    candidates, departments,
    interviews,
    job_listings,
    job_technologies,
    stages,
    technologies,
} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, eq, inArray, sql, SQL} from "drizzle-orm";
import {
    CACHE_TAGS,
    dbCache,
    getGlobalTag,
    getIdTag,
    revalidateDbCache,
} from "@/lib/cache";
import {z} from "zod";
import {filterJobSchema, jobFormSchema, updateJobListingSchema} from "@/zod";
import {ApplicationType, CandidateType, JobListingType} from "@/types";

type Technology = typeof technologies.$inferSelect;

interface FilterInterface extends z.infer<typeof filterJobSchema> {
    organization: string;
};

export const create_job_listing = async (data: z.infer<typeof jobFormSchema>) => {
    return await db.transaction(async (trx) => {
        // ── Job ──────────────────────────────────────────────────────────────
        const [inserted_job] = await trx
            .insert(job_listings)
            .values({
                name: data.jobInfo.job_name,
                location: data.jobInfo.job_location,
                salary_up_to: data.jobInfo.salary_up_to,
                type: data.jobInfo.job_type,
                created_by: String(data.userId),
                description: data.jobInfo.job_description,
                department: Number(data.jobInfo.department),
                organization: data.jobInfo.organization,
                subdomain: "bridge",
            })
            .$returningId();

        if (!inserted_job) return trx.rollback();

        // ── Technologies ──────────────────────────────────────────────────────
        const techs = await trx
            .insert(technologies)
            .values(
                data.jobTechnology.map((item) => ({
                    name: item.technology,
                    years_experience: Number(item.year_of_experience),
                })),
            )
            .$returningId();

        for (const tech of techs) {
            await trx.insert(job_technologies).values({
                id: tech.id * 2,
                job_id: inserted_job.id,
                technology_id: tech.id,
            });
        }
        ;

        // ── Stages ────────────────────────────────────────────────────────────
        await trx.insert(stages).values([
            // Add Applied as the first stage (order 0)
            {
                job_id: inserted_job.id,
                stage_name: 'Applied',
                stage_order_id: 0,
                assign_to: String(data.userId),
                need_schedule: false,
                color: '#a21caf',
            },
            // Add Drafted as the second stage (order 1)
            {
                job_id: inserted_job.id,
                stage_name: 'Drafted',
                stage_order_id: 1,
                assign_to: String(data.userId),
                need_schedule: false,
                color: '#52525b', // Gray color for applied state
            },
            // Then add the custom stages starting from order 2
            ...data.jobStages.map((item, i) => ({
                job_id: inserted_job.id,
                stage_name: item.stage_name,
                stage_order_id: i + 2,
                assign_to: String(item.stage_assign_to),
                need_schedule: item.need_schedule,
                color: item.color,
            })),
        ]);

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            id: String(inserted_job.id),
        });

        return inserted_job;
    });
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
            ...(data.name && {name: data.name}),
            ...(data.description && {description: data.description}),
            ...(data.location && {location: data.location}),
            ...(data.status && {status: data.status}),
            ...(department_id !== null && {department_id: department_id}),
            ...(data.organization && {organization: data.organization}),
            ...(data.salary_up_to && {salary_up_to: data.salary_up_to}),
            ...(data.type && {type: data.type}),
        })
        .where(eq(job_listings.id, data.jobId));

    revalidateDbCache({tag: CACHE_TAGS.jobs, id: String(data.jobId)});
};

export const delete_job_listing = async (jobId: number) => {
    await db
        .delete(job_listings)
        .where(eq(job_listings.id, jobId));

    revalidateDbCache({tag: CACHE_TAGS.jobs, id: String(jobId)});
};

export const get_job_listings_stages = (jobId: number) => {
    const cacheFn = dbCache(get_job_listings_stages_db, {
        tags: [getIdTag(String(jobId), CACHE_TAGS.stages)],
    });

    return cacheFn(jobId);
};

export const get_all_job_listings = (filter: FilterInterface) => {
    const cacheFn = dbCache(get_all_job_listings_db, {
        tags: [getGlobalTag(CACHE_TAGS.jobs)],
    });
    return cacheFn(filter);
};

export const get_job_by_id = (jobId: number, org_id: string) => {
    const cacheFn = dbCache(get_job_by_id_db, {
        tags: [getGlobalTag(CACHE_TAGS.applications), getIdTag(String(jobId), CACHE_TAGS.applications)],
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
                interviews: [],
                attachments:      [],
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
            interviewSets.set(row.application.id,  new Set());
            attachmentSets.set(row.application.id, new Set());
            jobListing.applications.push(application);
        };

        // ── Interviews (belong to application, not candidate) ─────────────────────
        if (row.interview?.id) {
            const seen = interviewSets.get(row.application.id)!;
            if (!seen.has(row.interview.id)) {
                seen.add(row.interview.id);
                application.interviews.push(row.interview);
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

    const [{count}] = await db
        .select({count: sql<number>`count(*)`})
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
            description: job_listings.description,
            created_at: job_listings.created_at,
            updated_at: job_listings.updated_at,
            createdBy: job_listings.created_by,
            candidatesCount: db.$count(
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
