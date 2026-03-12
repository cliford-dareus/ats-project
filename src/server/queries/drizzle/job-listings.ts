import {
    applications,
    attachments,
    candidates, departments,
    interviews,
    job_listings,
    job_technologies,
    stages,
    technologies,
    triggers,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import {
    CACHE_TAGS,
    dbCache,
    getGlobalTag,
    getIdTag,
    revalidateDbCache,
} from "@/lib/cache";
import { z } from "zod";
import { filterJobType, formSchema } from "@/zod";

type Technology = typeof technologies.$inferSelect;
type Interview = typeof interviews.$inferSelect;
type Attachment = typeof attachments.$inferSelect;
// type Stage = typeof stages.$inferSelect;

interface FilterInterface extends z.infer<typeof filterJobType> {
    organization: string;
};

type Candidate = {
    id: number;
    name: string;
    email: string;
    phone: string;
    cv_path: string;
    status: string | null;
    created_at: Date;
    updated_at: Date;
    interview: Interview[];
    attachment: Attachment[];
};

type ApplicationType = {
    id: number;
    application_id: number;
    job_id: number;
    application_created_at: Date;
    application_updated_at: Date;
    stageName: string | null;
    stage_order_id: number | null;
    candidate: Candidate;
};

type JobListing = {
    job_id: number;
    job_name: string;
    job_status: string | null;
    job_department: string;
    job_location: string;
    job_created_at: Date;
    job_updated_at: Date;
    job_description: string;
    job_technologies: Technology[];
    applications: ApplicationType[];
};

export const create_job_listing = async (data: z.infer<typeof formSchema>,) => {
    return await db.transaction(async (trx) => {
        const [inserted_job] = await trx
            .insert(job_listings)
            .values({
                name: data.jobInfo.job_name,
                location: data.jobInfo.job_location,
                salary_up_to: data.jobInfo.salary_up_to,
                description: data.jobInfo.job_description,
                createdBy: data.userId!,
                department: Number(data.jobInfo.department),
                organization: data.jobInfo.organization,
            })
            .$returningId();

        if (!inserted_job) {
            trx.rollback();
        };

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
        };

        await trx.insert(stages).values([
            // Add Applied as the first stage (order 0)
            {
                job_id: inserted_job.id,
                stage_name: 'Applied',
                stage_order_id: 0,
                assign_to: data.userId,
                need_schedule: false,
                color: '#6B7280', // Gray color for applied state
            },
            // Add Drafted as the second stage (order 1)
            {
                job_id: inserted_job.id,
                stage_name: 'Drafted',
                stage_order_id: 1,
                assign_to: data.userId,
                need_schedule: false,
                color: '#6B7280', // Gray color for applied state
            },
            // Then add the custom stages starting from order 2
            ...data.jobStages.map((item, i) => ({
                job_id: inserted_job.id,
                stage_name: item.stage_name,
                stage_order_id: i + 2,
                assign_to: item.stage_assign_to,
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

export const get_job_by_id = (jobId: number) => {
    const cacheFn = dbCache(get_job_by_id_db, {
        tags: [getGlobalTag(CACHE_TAGS.applications), getIdTag(String(jobId), CACHE_TAGS.applications)],
    });
    return cacheFn(jobId);
};

export const get_job_by_id_db = async (jobId: number): Promise<JobListing[]> => {
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
        .where(eq(job_listings.id, jobId));

    if (rows.length === 0) {
        return []; // Or throw an error if preferred
    };

    const firstRow = rows[0];
    const jobListing: JobListing = {
        job_id: firstRow.jobListing.id,
        job_name: firstRow.jobListing.name,
        job_status: firstRow.jobListing.status,
        job_department: firstRow.department?.name ?? '',
        job_location: firstRow.jobListing.location,
        job_created_at: firstRow.jobListing.created_at,
        job_updated_at: firstRow.jobListing.updated_at,
        job_description: firstRow.jobListing.description,
        job_technologies: [], // We'll populate this below
        applications: [],
    };

    const technologyMap = new Map<number, Technology>();
    const applicationMap = new Map<number, ApplicationType>();

    for (const row of rows) {
        if (row.experience?.id) {
            if (!technologyMap.has(row.experience.id)) {
                technologyMap.set(row.experience.id, row.experience);
            }
        }

        if (row.application?.id) {
            let application = applicationMap.get(row.application.id);
            if (!application) {
                application = {
                    id: row.application.id,
                    application_id: row.application.id,
                    job_id: row.jobListing.id,
                    application_created_at: row.application.created_at,
                    application_updated_at: row.application.updated_at,
                    stageName: row.stage?.stage_name ?? null,
                    stage_order_id: row.stage?.stage_order_id ?? null,
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
                            interview: [],
                            attachment: [],
                        }
                        : {} as unknown as Candidate, // Candidate object or empty object
                };
                applicationMap.set(row.application.id, application);
                jobListing.applications.push(application);
            };

            if (row.interview?.id && application?.candidate.interview) {
                if (!application.candidate.interview.some((int) => int.id === row.interview!.id)) {
                    application.candidate.interview.push(row.interview);
                }
            }

            // Add unique attachment to candidate (many-to-one candidate to attachments)
            if (row.attachment?.id && application?.candidate.attachment) {
                if (!application.candidate.attachment.some((att) => att.id === row.attachment!.id)) {
                    application.candidate.attachment.push(row.attachment);
                }
            }
        };
    };

    jobListing.job_technologies = Array.from(technologyMap.values());
    return [jobListing];
};

export const get_all_job_listings_db = async (filter: FilterInterface) => {
    const filters: SQL[] = [];

    // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
    if (filter.location) filters.push(inArray(job_listings.location, filter.location as string[]));
    if(filter.department) filters.push(inArray(departments.name, filter.department as string[]));
    // if(filter.status) filters.push(eq(job_listings.status, filter.status))

    const jobListings = await db
        .select({
            id: job_listings.id,
            name: job_listings.name,
            location: job_listings.location,
            status: job_listings.status,
            department: departments.name,
            organization: job_listings.organization,
            salary: job_listings.salary_up_to,
            description: job_listings.description,
            created_at: job_listings.created_at,
            updated_at: job_listings.updated_at,
            createdBy: job_listings.createdBy,
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

    const len = jobListings.length;
    return [len, jobListings];
};

export const get_job_listings_stages_db = async (jobId: number) => {
    return await db
        .select({
            id: stages.id,
            assign_to: stages.assign_to,
            color: stages.color,
            job_id: stages.job_id,
            need_schedule: stages.need_schedule,
            stage_name: stages.stage_name,
            stage_order_id: stages.stage_order_id,
            trigger: sql<string>`COALESCE(JSON_ARRAYAGG(
                JSON_OBJECT('id',
                ${triggers.id},'action_type',
                ${triggers.action_type},'config',
                ${triggers.config})),'[]')`.as("trigger"),
        })
        .from(stages)
        .leftJoin(triggers, eq(triggers.stage_id, stages.id))
        .where(eq(stages.job_id, jobId))
        .groupBy(stages.id);
};

export const update_job_listing = async (data: any) => {

};

// export const delete_job_listing = async (jobId: number) => {}
