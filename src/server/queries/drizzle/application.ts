import {
    applications,
    attachments,
    candidates,
    departments,
    interviews,
    job_listings,
    stages,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, asc, desc, eq, SQL, sql, inArray } from "drizzle-orm";
import {
    CACHE_TAGS,
    dbCache,
    getGlobalTag,
    getIdTag,
    getOrgTag,
    revalidateDbCache,
} from "@/lib/cache";
import {
    applicationFormSchema,
    filterApplicationsSchema,
    moveAndReorderApplicationSchema,
    updateApplicationSchema,
    updateApplicationStageSchema,
} from "@/zod";
import { z } from "zod";
import { uploadResumeToR2 } from "@/lib/upload-file-to-r2";
import { create_candidate_details } from "../mongo/candidate-details";
import { check_organization_subdomain } from "./organization";

export const create_application = async (data: z.infer<typeof applicationFormSchema>) => {
    const jobId = data.jobId;
    const subdomain = data.subdomain;

    // check if job is still exist and not closed/achieved
    const [job] = await db
        .select({
            id: job_listings.id,
            name: job_listings.name,
            description: job_listings.description,
        })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.subdomain, subdomain)));

    if (!job) {
        return { success: false, message: "Job not found" };
    }

    // 1. Get "Applied" stage
    const [appliedStage] = await db
        .select()
        .from(stages)
        .where(
            and(
                eq(stages.job_id, data.jobId),
                eq(stages.stage_order_id, 0),
                eq(stages.stage_name, "Applied"),
            ),
        );

    if (!appliedStage) {
        return { success: false, message: "Applied stage not found for this job" };
    }

    // 2. Check for duplicate application
    if (data.candidate) {
        const existingApp = await db
            .select()
            .from(applications)
            .where(
                and(
                    eq(applications.job_id, jobId),
                    eq(applications.candidate, Number(data.candidate)),
                ),
            );

        if (existingApp.length > 0) {
            return {
                success: false,
                message: "Candidate already has an application for this job",
            };
        }
    }

    // 3. check if an organization has this subdomain
    const existingSubdomain = await check_organization_subdomain(subdomain);
    if (existingSubdomain.length == 0) {
        return {
            success: false,
            message: "No organization found with this subdomain",
        };
    }

    try {
        let candidate_id: number;
        if (data.candidate) {
            // === EXISTING CANDIDATE ===
            candidate_id = Number(data.candidate);
        } else {
            // === NEW CANDIDATE ===
            const info = data.personalInfo as {
                firstName: string;
                lastName: string;
                email: string;
                phone: string;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                portfolioUrl: string | undefined;
                linkedinUrl: string | undefined;
            };

            // Better uniqueness check: email (not name)
            const existingCandidate = await db
                .select({ id: candidates.id, file_key: candidates.cv_path })
                .from(candidates)
                .where(eq(candidates.email, info.email));

            if (existingCandidate.length > 0) {
                candidate_id = existingCandidate[0].id;
            } else {
                const resumeFile = data?.file?.file_ as File | undefined;
                console.log("Form Submitted:", data.file);
                let cvKey = `no-resume-${info.firstName}-${Date.now()}`;

                const candidateFullName = `${info.firstName} ${info.lastName}`;
                if (resumeFile && resumeFile.size > 0) {
                    cvKey = await uploadResumeToR2(resumeFile, candidateFullName);
                }

                // Create candidate
                const [new_candidate] = await db
                    .insert(candidates)
                    .values({
                        organization: existingSubdomain[0].id,
                        name: candidateFullName,
                        email: info.email,
                        phone: info.phone,
                        location: info.city,
                        address: info.address,
                        city: info.city,
                        state: info.state,
                        zip_code: info.zipCode,
                        cv_path: cvKey,
                        subdomain: subdomain,
                    })
                // .$returningId();

                candidate_id = new_candidate.insertId;

                // Create attachment record
                await db.insert(attachments).values({
                    file_name: `${info.firstName}'s Resume`,
                    file_url: cvKey, // we store the R2 key
                    candidate_id: candidate_id,
                    attachment_type: "RESUME",
                });

                // Create candidate details record
                await create_candidate_details({
                    candidate_id: candidate_id,
                    resumeSummary: "No resume summary provided",
                    skills: [],
                    experience: data.workExperience ?? [],
                    education: data.education ?? [],
                    references: data.references ?? [],
                    key_accomplishments: [],
                });

                revalidateDbCache({ tag: CACHE_TAGS.candidates, orgId: existingSubdomain[0].id });
            }
        }

        const [candidate] = await db
            .select()
            .from(candidates)
            .where(eq(candidates.id, candidate_id));

        const file_key = candidate.cv_path;

        // === CREATE APPLICATION ===
        // 4. Create application (shared for both paths)
        const [new_application] = await db
            .insert(applications)
            .values({
                organization: existingSubdomain[0].id,
                job_id: jobId,
                candidate: candidate_id,
                current_stage_id: appliedStage.id,
                subdomain: subdomain, // make subdomain unique in the database
            })
            .$returningId();

        // Revalidate cache
        revalidateDbCache({
            tag: CACHE_TAGS.applications,
            orgId: existingSubdomain[0].id,
        });

        revalidateDbCache({
            tag: CACHE_TAGS.candidates,
            id: String(candidate_id),
            orgId: existingSubdomain[0].id,
        });

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            id: String(jobId),
            orgId: existingSubdomain[0].id,
        });

        return {
            success: true,
            candidate_id,
            job_id: job.id,
            job_name: job.name,
            job_description: job.description,
            application_id: new_application.id,
            file_url: file_key,
            message: "Application created successfully",
        };
    } catch (err) {
        console.error("Create application error:", err);
        throw new Error((err as Error).message || "Failed to create application");
    }
};

export const update_application = async (data: z.infer<typeof updateApplicationSchema>, orgId: string) => {
    await db
        .update(applications)
        .set({
            ...(data.job_id !== undefined && { job_id: data.job_id }),
            ...(data.current_stage_id !== undefined && { current_stage_id: data.current_stage_id }),
            ...(data.candidate !== undefined && { candidate: data.candidate }),
            ...(data.can_contact !== undefined && { can_contact: data.can_contact }),
            ...(data.position_in_stage !== undefined && { position_in_stage: data.position_in_stage }),
            // NOTE: organization is deliberately NOT updatable here — allowing
            // it would let a caller move an application into another org.
            ...(data.subdomain !== undefined && { subdomain: data.subdomain }),
        })
        // Org-scoped: an application from another org is never updated.
        .where(and(eq(applications.id, data.applicationId), eq(applications.organization, orgId)));

    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
        id: String(data.candidate),
        orgId,
    });
    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId,
    });
};

export const update_application_stage = async (data: z.infer<typeof updateApplicationStageSchema>, orgId: string) => {
    await db
        .update(applications)
        .set({ current_stage_id: data.new_stage_id })
        // Org-scoped: an application from another org is never moved.
        .where(and(eq(applications.id, data.applicationId), eq(applications.organization, orgId)));

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId,
    });
};

// ── Dashboard quick-add ───────────────────────────────────────────────────────
// Creates an application for an EXISTING candidate (no resume parsing, no
// public-form payload). Used by the dashboard "Add Applicant" modal — the
// public apply flow uses create_application instead. Everything is verified
// against the session org: job, candidate, and the Applied stage.
export const create_application_for_candidate_db = async (jobId: number, candidateId: number, orgId: string) => {
    const [job] = await db
        .select({ id: job_listings.id, subdomain: job_listings.subdomain })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)))
        .limit(1);
    if (!job) {
        return { success: false as const, message: "Job not found" };
    }

    const [candidate] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId)))
        .limit(1);
    if (!candidate) {
        return { success: false as const, message: "Candidate not found" };
    }

    const existing = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.job_id, jobId), eq(applications.candidate, candidateId)))
        .limit(1);
    if (existing.length > 0) {
        return { success: false as const, message: "Candidate already has an application for this job" };
    }

    const [appliedStage] = await db
        .select()
        .from(stages)
        .where(
            and(
                eq(stages.job_id, jobId),
                eq(stages.stage_order_id, 0),
                eq(stages.stage_name, "Applied"),
            ),
        )
        .limit(1);
    if (!appliedStage) {
        return { success: false as const, message: "Applied stage not found for this job" };
    }

    const [application] = await db
        .insert(applications)
        .values({
            organization: orgId,
            job_id: jobId,
            candidate: candidateId,
            current_stage_id: appliedStage.id,
            subdomain: job.subdomain,
        })
        .$returningId();

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(application.id),
        orgId,
    });
    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
        id: String(candidateId),
        orgId,
    });

    return { success: true as const, application_id: application.id };
};

export const get_application_by_id = async (applicationId: number, orgId: string) => {
    const cacheFn = dbCache(get_application_by_id_db, {
        tags: [
            getIdTag(String(applicationId), CACHE_TAGS.applications),
            getOrgTag(orgId, CACHE_TAGS.applications),
        ],
    });

    return cacheFn(applicationId, orgId);
};

export const get_all_applications = async (filter: z.infer<typeof filterApplicationsSchema>) => {
    const cacheFn = dbCache(get_all_applications_db, {
        keyParts: ["applications", filter.organization, JSON.stringify(filter)],
        tags: [
            getOrgTag(filter.organization, CACHE_TAGS.applications),
            getGlobalTag(CACHE_TAGS.applications),
        ],
    });

    return cacheFn(filter);
};

export const get_job_all_applications = async (jobId: number, orgId?: string) => {
    const cacheFn = dbCache(get_job_all_applications_db, {
        keyParts: ["job-applications", String(jobId), orgId ?? ""],
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.applications),
            getGlobalTag(CACHE_TAGS.applications),
            ...(orgId ? [getOrgTag(orgId, CACHE_TAGS.applications)] : []),
        ],
    });

    return cacheFn(jobId);
};

export const get_application_stage = async (orgId: string) => {
    const cacheFn = dbCache(get_applications_stages_db, {
        keyParts: ["stages", orgId],
        tags: [
            getGlobalTag(CACHE_TAGS.stages),
            getOrgTag(orgId, CACHE_TAGS.stages),
        ],
    });

    return cacheFn(orgId);
};

export const get_applications_stages_db = async (orgId: string) => {
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
        // stages carry no org column — scope via their job.
        .innerJoin(job_listings, eq(stages.job_id, job_listings.id))
        .leftJoin(applications, eq(applications.current_stage_id, stages.id))
        .where(eq(job_listings.organization, orgId));
};

export const get_application_by_id_db = async (applicationId: number, orgId: string) => {
    return db
        .select({
            id: applications.id,
            current_stage: stages.stage_name,
            apply_date: applications.created_at,
            updated_at: applications.updated_at,
            // candidate
            candidate_id: candidates.id,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            candidate_phone: candidates.phone,
            candidate_cv: candidates.cv_path,
            can_contact: applications.can_contact,
            // job
            job_id: job_listings.id,
            job_apply: job_listings.name,
            status: job_listings.status,
            location: job_listings.location,
            type: job_listings.type,
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
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)));
};

export const get_all_applications_db = async (filter: z.infer<typeof filterApplicationsSchema>) => {
    const filters: SQL[] = [];

    if (filter.keywords && filter.keywords.length > 0) {
        const keywordFilters = filter.keywords.map(
            (keyword) => sql`${job_listings.name} LIKE ${`%${keyword}%`}`,
        );
        filters.push(sql`(${sql.join(keywordFilters, sql` OR `)})`);
    }

    if (filter.location) {
        const locations = Array.isArray(filter.location)
            ? filter.location
            : [filter.location];
        filters.push(inArray(job_listings.location, locations));
    }

    if (filter.department) {
        filters.push(inArray(departments.name, filter.department));
    }

    if (filter.stages) {
        filters.push(eq(stages.stage_name, filter.stages));
    }

    // if (filter.status) {
    //     const statuses = Array.isArray(filter.status) ? filter.status: [filter.status];
    //     filters.push(inArray(applications.status, statuses));
    // }

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(departments, eq(job_listings.department, departments.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(...filters, eq(applications.organization, filter.organization)));

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
            job_department: job_listings.department,
            //  Candidate Info
            candidate_id: candidates.id,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            candidate_phone: candidates.phone,
            candidate_cv: candidates.cv_path,
        })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(departments, eq(job_listings.department, departments.id))
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(...filters, eq(job_listings.organization, filter.organization)))
        .limit(filter.limit!)
        .offset(filter.offset!);

    return [count, application];
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
            desc(applications.created_at),
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
                interviews: row.interview  ?? null,
                stage: row.stage ? row.stage.stage_name : "",
            };
        }

        // Add unique attachments
        if (
            row.attachment &&
            !acc[appId].candidate.attachments.find(
                (a: any) => a.id === row?.attachment?.id,
            )
        ) {
            acc[appId].candidate.attachments.push(row.attachment);
        }

        return acc;
    }, {});

    return Object.values(result);
};

export async function db_save_resume_score(payload: {
    applicationId: number;
    score: number;
    breakdown: { fit: number; skills: number; experience: number };
    summary: string;
    model: string;
}) {
    await db
        .update(applications)
        .set({
            resume_score: payload.score,
            resume_score_fit: payload.breakdown.fit,
            resume_score_skills: payload.breakdown.skills,
            resume_score_exp: payload.breakdown.experience,
            resume_score_summary: payload.summary,
            resume_scored_at: new Date(),
            resume_score_model: payload.model,
            updated_at: new Date(),
        })
        .where(eq(applications.id, payload.applicationId));

    // revalidateDbCache({
    //     tag: CACHE_TAGS.applications,
    //     id: String(payload.applicationId),
    //     orgId: orgId,
    // });
}

export async function move_application_and_reorder_db({
    applicationId,
    newStageId,
    sourceStageId,
    targetOrders,
    sourceOrders,
}: z.infer<typeof moveAndReorderApplicationSchema>) {
    try {
        await db.transaction(async (tx) => {
            // 1. Update stage (only if moving)
            if (sourceStageId && sourceStageId !== newStageId) {
                await tx
                    .update(applications)
                    .set({ current_stage_id: newStageId })
                    .where(eq(applications.id, applicationId));
            }

            // 2. Update target stage orders
            if (targetOrders.length > 0) {
                const targetCases = targetOrders.map(
                    ({ id, position }) => sql`WHEN
                    ${id}
                    THEN
                    ${position}`,
                );
                const targetIds = targetOrders.map((o) => o.id);

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
                            inArray(applications.id, targetIds),
                        ),
                    );
            }

            // 3. Update source stage orders (if it was a move)
            if (sourceOrders && sourceOrders.length > 0 && sourceStageId) {
                const sourceCases = sourceOrders.map(
                    ({ id, position }) => sql`WHEN
                    ${id}
                    THEN
                    ${position}`,
                );
                const sourceIds = sourceOrders.map((o) => o.id);

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
                            inArray(applications.id, sourceIds),
                        ),
                    );
            }
        });

        revalidateDbCache({ tag: CACHE_TAGS.applications });
        return { success: true };
    } catch (err) {
        console.error("Move + reorder transaction failed:", err);
        return {
            success: false,
            error: "Failed to move application and update order",
        };
    }
}