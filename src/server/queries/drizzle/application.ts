import {
    applications,
    attachments,
    candidates, departments,
    interviews,
    job_listings,
    scoreCards,
    stages,
} from "@/drizzle/schema";
import {db} from "@/drizzle/db";
import {and, asc, desc, eq, SQL, sql, inArray} from "drizzle-orm";
import {
    CACHE_TAGS,
    dbCache,
    getGlobalTag,
    revalidateDbCache,
} from "@/lib/cache";
import {candidateForm, filterApplicationsType, JOB_ENUM} from "@/zod";
import {z} from "zod";
import {revalidatePath} from "next/cache";

interface CandidateInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
};

// TODO: FIX LATER
export const create_application = async (data: z.infer<typeof candidateForm>) => {
    // Get the "Applied" stage (should be stage_order_id = 0)
    const [applied_stage] = await db
        .select()
        .from(stages)
        .where(
            and(
                eq(stages.job_id, Number(data.job)),
                eq(stages.stage_order_id, 0),
                eq(stages.stage_name, 'Applied')
            )
        );

    // Check if user is passing a candidate id
    const canditate_exist = await db.select()
        .from(candidates)
        .where(eq(candidates.name, data.candidate!));

    const candidateAlreadyHaveApplication = await db.select()
        .from(applications)
        .where(
            and(
                eq(applications.job_id, Number(data.job)),
                eq(applications.candidate, Number(data.candidate))

            )
        );

    if (candidateAlreadyHaveApplication.length > 0) {
        return "Candidate already have an application"
    };

    if (!data.candidate && !canditate_exist) {
        try {
            const info = data.candidate_info as CandidateInfo;
            // const file = data.candidate_file as { resume: FileList, cover_letter: FileList }

            const [candidate] = await db
                .insert(candidates)
                .values({
                    name: `${info.first_name} ${info.last_name}`,
                    // location: info.location,
                    email: info.email,
                    phone: info.phone,
                    cv_path: `no path-${info.first_name}`,
                })
                .$returningId();

            await db.insert(attachments).values({
                file_name: `${info.first_name} ${"resume"}`,
                file_url: "udhsjhdjsh.com",
                candidate_id: candidate.id,
                attachment_type: "RESUME",
            });

            const [application] = await db.insert(applications).values({
                job_id: Number(data.job),
                candidate: candidate.id,
                current_stage_id: applied_stage.id, // Use Applied stage
            });

            revalidateDbCache({
                tag: CACHE_TAGS.applications,
            });

            revalidateDbCache({
                tag: CACHE_TAGS.jobs,
            });

            return application;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    await db.insert(applications).values({
        job_id: Number(data.job),
        candidate: Number(data.candidate),
        current_stage_id: applied_stage.id, // Use Applied stage
    });

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
    });

    revalidateDbCache({
        tag: CACHE_TAGS.jobs,
    });

    return "application created";
};

export const update_application_stage = async (data: { applicationId: number, new_stage_id: number }) => {
    await db
        .update(applications)
        .set({current_stage_id: data.new_stage_id})
        .where(eq(applications.id, data.applicationId))

    revalidateDbCache({tag: CACHE_TAGS.candidates,});
    revalidateDbCache({tag: CACHE_TAGS.applications});
    // revalidatePath('/(dashboard)/jobs/[joblistingId]');
};

export const get_application_by_id = async (applicationId: number) => {
    const cacheFn = dbCache(get_application_by_id_db, {
        tags: [getGlobalTag(CACHE_TAGS.applications)],
    });

    return cacheFn(applicationId);
};

export const get_applications_with_filter = async (filter: z.infer<typeof filterApplicationsType>) => {
    const cacheFn = dbCache(get_applications_with_filter_db, {
        tags: [getGlobalTag(CACHE_TAGS.applications)],
    });

    return cacheFn(filter);
};

export const get_job_all_applications = async (jobId: number) => {
    const cacheFn = dbCache(get_job_all_applications_db, {
        tags: [getGlobalTag(CACHE_TAGS.applications)],
    });

    return cacheFn(jobId);
};

export const get_application_stage = async () => {
    const cacheFn = dbCache(get_applications_stages_db, {
        tags: [getGlobalTag(CACHE_TAGS.stages)],
    });

    return cacheFn();
};

export const get_applications_stages_db = async () => {
    return db
        .select({
            color: stages.color,
            stageId: stages.id,
            stages: stages.stage_name,
            count: db.$count(
                applications,
                eq(applications.current_stage_id, stages.id),
            ),
        })
        .from(stages)
        .leftJoin(applications, eq(applications.current_stage_id, stages.id));
};

export const get_application_by_id_db = async (applicationId: number) => {
    return  await db
        .select({
            id: applications.id,
            status: job_listings.status,
            current_stage: stages.stage_name,
            apply_date: applications.created_at,
            updated_at: applications.updated_at,
            candidate_id: candidates.id,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            candidate_phone: candidates.phone,
            job_id: job_listings.id,
            job_apply: job_listings.name,
            location: job_listings.location,
            interview: interviews,
            department: departments.name,
            stage: stages.stage_name,
        })
        .from(applications)
        .leftJoin(job_listings, eq(job_listings.id, applications.job_id))
        .leftJoin(departments, eq(departments.id, job_listings.department))
        .leftJoin(candidates, eq(candidates.id, applications.candidate))
        .leftJoin(interviews, eq(interviews.applications_id, applications.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(eq(applications.id, applicationId));

};

export const get_applications_with_filter_db = async (filter: z.infer<typeof filterApplicationsType>) => {
    const filters: SQL[] = [];

    if (filter.stages)
        filters.push(eq(applications.current_stage_id, filter.stages));
    // if(filter.department) filters.push(inArray(job_listings.department, filter.department as string[]))
    // if(filter.keywords) filters.push(inArray(job_listings.keywords, filter.keywords as string[]))
    // if(filter.status) filters.push(eq(job_listings.status, filter.status))

    const application = await db
        .select({
            id: applications.id,
            status: job_listings.status,
            can_contact: applications.can_contact,
            current_stage: stages.stage_name,
            location: job_listings.location,
            assign_to: stages.assign_to,
            apply_date: applications.created_at,
            // Job Info
            job_id: applications.job_id,
            job_apply: job_listings.name,
            job_org: job_listings.organization,
            //  Candidate Info
            candidate_id: candidates.id,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            candidate_phone: candidates.phone,
        })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(...filters, eq(job_listings.organization, filter.organization)))
        .limit(filter.limit!)
        .offset(filter.offset!);

    const len = application.length;
    return [len, application];
};

export const get_job_all_applications_db = async (jobId: number) => {
    const rows = await db
        .select({
            application: applications,
            candidate: candidates,
            attachment: attachments,
            interview: interviews,
            stage: stages,
        })
        .from(applications)
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(attachments, eq(candidates.id, attachments.candidate_id))
        .leftJoin(interviews, eq(applications.id, interviews.applications_id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(eq(applications.job_id, jobId))
        .orderBy(
            applications.current_stage_id,
            asc(applications.position_in_stage),
            desc(applications.created_at)
        );

    // MANUALLY REDUCE THE ROWS
    const result = rows.reduce<Record<number, any>>((acc, row) => {
        const appId = row.application.id;

        if (!acc[appId]) {
            acc[appId] = {
                ...row.application,
                candidate: {
                    ...row.candidate,
                    attachments: [],
                },
                interviews: [],
                stage: row.stage ? row.stage.stage_name : "",
            };
        }

        // Add unique attachments
        if (row.attachment && !acc[appId].candidate.attachments.find((a: any) => a.id === row?.attachment?.id)) {
            acc[appId].candidate.attachments.push(row.attachment);
        }

        // Add unique interviews
        if (row.interview && !acc[appId].interviews.find((i: any) => i.id === row?.interview?.id)) {
            acc[appId].interviews.push(row.interview);
        }

        return acc;
    }, {});

    return Object.values(result);
};

export async function move_application_and_reorder_db({
                                                          applicationId,
                                                          newStageId,
                                                          sourceStageId,
                                                          targetOrders,
                                                          sourceOrders,
                                                      }: {
    applicationId: number;
    newStageId: number;
    sourceStageId?: number;
    targetOrders: any[];
    sourceOrders?: any[];
}) {
    try {
        await db.transaction(async (tx) => {
            // 1. Update stage (only if moving)
            if (sourceStageId && sourceStageId !== newStageId) {
                await tx
                    .update(applications)
                    .set({current_stage_id: newStageId})
                    .where(eq(applications.id, applicationId));
            }

            // 2. Update target stage orders
            if (targetOrders.length > 0) {
                const targetCases = targetOrders.map(
                    ({id, position}) => sql`WHEN
                    ${id}
                    THEN
                    ${position}`
                );
                const targetIds = targetOrders.map(o => o.id);

                await tx
                    .update(applications)
                    .set({
                        position_in_stage: sql`CASE
                        ${applications.id}
                        ${sql.join(targetCases, sql` `)}
                        END`,
                    })
                    .where(
                        and(
                            eq(applications.current_stage_id, newStageId),
                            inArray(applications.id, targetIds)
                        )
                    );
            }

            // 3. Update source stage orders (if it was a move)
            if (sourceOrders && sourceOrders.length > 0 && sourceStageId) {
                const sourceCases = sourceOrders.map(
                    ({id, position}) => sql`WHEN
                    ${id}
                    THEN
                    ${position}`
                );
                const sourceIds = sourceOrders.map(o => o.id);

                await tx
                    .update(applications)
                    .set({
                        position_in_stage: sql`CASE
                        ${applications.id}
                        ${sql.join(sourceCases, sql` `)}
                        END`,
                    })
                    .where(
                        and(
                            eq(applications.current_stage_id, sourceStageId),
                            inArray(applications.id, sourceIds)
                        )
                    );
            }
        });

        // revalidatePath("/jobs/[jobId]");
        revalidateDbCache({tag: CACHE_TAGS.applications});
        return {success: true};
    } catch (err) {
        console.error("Move + reorder transaction failed:", err);
        return {success: false, error: "Failed to move application and update order"};
    }
}

// ========================================================================
// INTERVIEW
// =======================================================================
export const add_interview = async ({
                                        applicationId,
                                        location,
                                        start_at,
                                        end_at,
                                    }: {
    applicationId: number;
    location: string;
    start_at: Date;
    end_at: Date;
}) => {
    return await db.insert(interviews).values({
        applications_id: applicationId,
        locations: location,
        start_at: start_at,
        end_at: end_at,
    });
};
