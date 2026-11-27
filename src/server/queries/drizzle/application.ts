import {
    applications,
    attachments,
    candidates,
    departments,
    interviews,
    job_listings,
    score_cards,
    screening_answers,
    screening_questions,
    stages,
} from "@/drizzle/schema";
import { db } from "@/drizzle/db";
import { and, asc, desc, eq, isNotNull, isNull, SQL, sql, inArray } from "drizzle-orm";
import mongodb from "@/lib/mongodb";
import Note from "@/models/notes";
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
import { validateResumeFile } from "@/lib/resume-validation";
import { validateScreeningAnswers } from "@/lib/screening";
import { create_candidate_details } from "../mongo/candidate-details";
import { check_organization_subdomain } from "./organization";

// Public apply-page lookup: the job the applicant is applying to, resolved
// by id + subdomain. The page uses this to refuse the form for missing or
// non-OPEN jobs before the applicant fills anything in.
export const get_public_job_for_apply = async (jobId: number, subdomain: string) => {
    const [job] = await db
        .select({
            id: job_listings.id,
            name: job_listings.name,
            status: job_listings.status,
        })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.subdomain, subdomain), isNull(job_listings.deleted_at)))
        .limit(1);

    return job ?? null;
};

// A soft-deleted application still occupies its (job_id, candidate) slot
// in the unique index, so ignoring trashed rows in the duplicate check
// alone would let the fresh insert die with ER_DUP_ENTRY. When the only
// existing application for (job, candidate) is trashed, remove that trashed
// row — its interviews/scorecards (FK cascade) and its Mongo notes — so a
// re-application proceeds as a new application. The unique index itself
// is unchanged. No activity is recorded here: the public apply flow has
// no session for record_activity to read an actor from.
const remove_trashed_application = async (jobId: number, candidateId: number, orgId: string) => {
    const [trashed] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
            and(
                eq(applications.job_id, jobId),
                eq(applications.candidate, candidateId),
                eq(applications.organization, orgId),
                isNotNull(applications.deleted_at),
            ),
        )
        .limit(1);
    if (!trashed) return;

    await db.transaction(async (tx) => {
        const interviewRows = await tx
            .select({ id: interviews.id })
            .from(interviews)
            .where(eq(interviews.applications_id, trashed.id));
        const interviewIds = interviewRows.map((row) => row.id);

        if (interviewIds.length > 0) {
            await tx
                .delete(score_cards)
                .where(inArray(score_cards.interviews_id, interviewIds));
            await tx
                .delete(interviews)
                .where(eq(interviews.applications_id, trashed.id));
        }

        await tx.delete(applications).where(eq(applications.id, trashed.id));
    });

    await mongodb();
    await Note.deleteMany({ note_id: `application_${trashed.id}` });
};

export const create_application = async (
    data: z.infer<typeof applicationFormSchema>,
    // Optional screening answers from the public apply form. Shape:
    // [{ questionId: number, answer: string }]. Validated server-side
    // below (validateScreeningAnswers); omitted/empty + required
    // questions on the job = validation failure.
    screeningAnswers?: Array<{ questionId: number; answer: string }>,
) => {
    const jobId = data.jobId;
    const subdomain = data.subdomain;

    // check if job is still exist and not closed/achieved
    const [job] = await db
        .select({
            id: job_listings.id,
            name: job_listings.name,
            description: job_listings.description,
            status: job_listings.status,
        })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.subdomain, subdomain), isNull(job_listings.deleted_at)));

    if (!job) {
        return { success: false, message: "Job not found" };
    }

    // Only OPEN jobs accept applications — closed/archived/draft/pending jobs
    // must not accept submissions via a direct link (same check the apply
    // page performs before rendering the form).
    if (job.status !== "OPEN") {
        return { success: false, message: "This job is no longer accepting applications" };
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

    // 2. check if an organization has this subdomain
    const existingSubdomain = await check_organization_subdomain(subdomain);
    if (existingSubdomain.length == 0) {
        return {
            success: false,
            message: "No organization found with this subdomain",
        };
    }
    const orgId = existingSubdomain[0].id;

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
    const additional = data.additionalInfo ?? {};
    const resumeFile = data?.file?.file_ as File | undefined;
    const hasResume = !!resumeFile && resumeFile.size > 0;

    // Validate the resume up front — same limits as the dashboard upload
    // path — so a bad file fails before any row is written.
    if (hasResume) {
        const resumeError = validateResumeFile(resumeFile);
        if (resumeError) {
            return { success: false, message: resumeError };
        }
    }

    const emptyToNull = (value: string | undefined): string | null =>
        value && value.trim() ? value.trim() : null;

    try {
        // 3. Resolve the candidate. An explicit id (dashboard callers) wins
        // when it belongs to this org; otherwise the public form resolves by
        // email within this org — email is the identity across applies.
        let candidate_id: number | null = null;
        if (data.candidate) {
            const [byId] = await db
                .select({ id: candidates.id })
                .from(candidates)
                .where(
                    and(
                        eq(candidates.id, Number(data.candidate)),
                        eq(candidates.organization, orgId),
                        isNull(candidates.deleted_at),
                    ),
                )
                .limit(1);
            if (byId) candidate_id = byId.id;
        }
        if (!candidate_id) {
            const [byEmail] = await db
                .select({ id: candidates.id })
                .from(candidates)
                .where(
                    and(
                        eq(candidates.email, info.email),
                        eq(candidates.organization, orgId),
                        isNull(candidates.deleted_at),
                    ),
                )
                .limit(1);
            if (byEmail) candidate_id = byEmail.id;
        }

        const candidateFullName = `${info.firstName} ${info.lastName}`;

        // 4. Duplicate check: one LIVE application per (job, candidate),
        // however the candidate was resolved. A soft-deleted (trashed)
        // application does not block re-application — it is ignored here
        // and cleared by remove_trashed_application below, since it still
        // holds the unique (job_id, candidate) slot. The unique index is
        // the race-safe backstop — see the catch below.
        if (candidate_id) {
            const existingApp = await db
                .select({ id: applications.id })
                .from(applications)
                .where(
                    and(
                        eq(applications.job_id, jobId),
                        eq(applications.candidate, candidate_id),
                        isNull(applications.deleted_at),
                    ),
                )
                .limit(1);

            if (existingApp.length > 0) {
                // A returning applicant's new resume is still worth keeping:
                // persist it on the candidate record instead of dropping it.
                if (hasResume) {
                    const cvKey = await uploadResumeToR2(resumeFile, candidateFullName, {
                        orgId,
                        candidateId: candidate_id,
                    });
                    await persistCandidateResume(candidate_id, cvKey, `${info.firstName}'s Resume`);
                }
                return {
                    success: false,
                    message: "You've already applied for this role. Our team will be in touch soon.",
                };
            }

            // No live application — clear a trashed one, if any, so the
            // fresh insert below is not rejected by the unique index.
            await remove_trashed_application(jobId, candidate_id, orgId);
        }

        // 4b. Screening answers. Runs AFTER the duplicate check above, so
        // a returning applicant still gets the duplicate message first,
        // and BEFORE any new row is written, so a failed validation leaves
        // nothing behind. If the job has required questions and
        // screeningAnswers is omitted/empty, validateScreeningAnswers
        // fails (required unanswered) and the form shows the message
        // inline — same { success: false, message } shape as every other
        // failure in this function.
        const questionRows = await db
            .select()
            .from(screening_questions)
            .where(eq(screening_questions.job_id, jobId))
            .orderBy(asc(screening_questions.sort_order), asc(screening_questions.id));
        const screeningResult = validateScreeningAnswers(
            questionRows.map((row) => ({
                id: row.id,
                questionText: row.question_text,
                type: row.type,
                options: row.options,
                isRequired: row.is_required,
                sortOrder: row.sort_order,
            })),
            screeningAnswers,
        );
        if (!screeningResult.success) {
            return { success: false, message: screeningResult.message };
        }
        const validatedScreeningAnswers = screeningResult.answers;

        if (!candidate_id) {
            // === NEW CANDIDATE ===
            // cv_path starts empty — never a fabricated `no-resume-...` key;
            // it is filled in below when a resume was actually uploaded.
            const [new_candidate] = await db
                .insert(candidates)
                .values({
                    organization: orgId,
                    name: candidateFullName,
                    email: info.email,
                    phone: info.phone,
                    location: info.city,
                    address: info.address,
                    city: info.city,
                    state: info.state,
                    zip_code: info.zipCode,
                    cv_path: "",
                    subdomain: subdomain,
                    portfolio_url: emptyToNull(info.portfolioUrl),
                    linkedin_url: emptyToNull(info.linkedinUrl),
                });

            candidate_id = new_candidate.insertId;

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

            revalidateDbCache({ tag: CACHE_TAGS.candidates, orgId });
        } else {
            // === RETURNING CANDIDATE ===
            // Keep the stored profile current with what they just provided.
            await db
                .update(candidates)
                .set({
                    ...(emptyToNull(info.portfolioUrl)
                        ? { portfolio_url: emptyToNull(info.portfolioUrl) }
                        : {}),
                    ...(emptyToNull(info.linkedinUrl)
                        ? { linkedin_url: emptyToNull(info.linkedinUrl) }
                        : {}),
                    ...(info.phone ? { phone: info.phone } : {}),
                })
                .where(eq(candidates.id, candidate_id));
        }

        // 5. Persist the resume when one was uploaded (new or returning
        // candidate): org-scoped R2 key, cv_path updated, RESUME attachment
        // upserted. No resume → cv_path stays as-is ("" for a new candidate)
        // and no attachment row is created.
        if (hasResume) {
            const cvKey = await uploadResumeToR2(resumeFile, candidateFullName, {
                orgId,
                candidateId: candidate_id,
            });
            await persistCandidateResume(candidate_id, cvKey, `${info.firstName}'s Resume`);
        }

        const [candidate] = await db
            .select()
            .from(candidates)
            .where(eq(candidates.id, candidate_id));

        const file_key = candidate.cv_path;

        // === CREATE APPLICATION ===
        // 6. Create application (shared for both paths) — and, in the SAME
        // transaction, its screening answers, so an application is never
        // left without the answers it was submitted with (and vice versa).
        // The answers carry the question text/type/order snapshots
        // produced by validateScreeningAnswers above.
        const [new_application] = await db.transaction(async (tx) => {
            const [app] = await tx
                .insert(applications)
                .values({
                    organization: orgId,
                    job_id: jobId,
                    candidate: candidate_id,
                    current_stage_id: appliedStage.id,
                    subdomain: subdomain, // make subdomain unique in the database
                    cover_letter: emptyToNull(additional.coverLetter),
                    referral_source: emptyToNull(additional.referralSource),
                    expected_salary: emptyToNull(additional.expectedSalary),
                    earliest_start_date: emptyToNull(additional.earliestStartDate),
                })
                .$returningId();

            if (validatedScreeningAnswers.length > 0) {
                await tx.insert(screening_answers).values(
                    validatedScreeningAnswers.map((answer) => ({
                        application_id: app.id,
                        question_id: answer.questionId,
                        question_text: answer.questionText,
                        question_type: answer.questionType,
                        sort_order: answer.sortOrder,
                        answer_text: answer.answer,
                    })),
                );
            }

            return [app];
        });

        // Revalidate cache
        revalidateDbCache({
            tag: CACHE_TAGS.applications,
            orgId,
        });

        revalidateDbCache({
            tag: CACHE_TAGS.candidates,
            id: String(candidate_id),
            orgId,
        });

        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            id: String(jobId),
            orgId,
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
        // Two concurrent submits can both pass the duplicate check above;
        // the unique (job_id, candidate) index rejects the second insert —
        // report it as a duplicate, not a crash.
        if ((err as { code?: string })?.code === "ER_DUP_ENTRY") {
            return {
                success: false,
                message: "You've already applied for this role. Our team will be in touch soon.",
            };
        }
        console.error("Create application error:", err);
        throw new Error((err as Error).message || "Failed to create application");
    }
};

// Store a resume key on the candidate and keep exactly one RESUME
// attachment pointing at it (update the existing one, or insert).
const persistCandidateResume = async (candidateId: number, cvKey: string, fileName: string) => {
    await db.update(candidates).set({ cv_path: cvKey }).where(eq(candidates.id, candidateId));

    const [existing] = await db
        .select({ id: attachments.id })
        .from(attachments)
        .where(
            and(
                eq(attachments.candidate_id, candidateId),
                eq(attachments.attachment_type, "RESUME"),
            ),
        )
        .limit(1);

    if (existing) {
        await db
            .update(attachments)
            .set({ file_name: fileName, file_url: cvKey })
            .where(eq(attachments.id, existing.id));
    } else {
        await db.insert(attachments).values({
            file_name: fileName,
            file_url: cvKey,
            candidate_id: candidateId,
            attachment_type: "RESUME",
        });
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
        // A trashed application is never updated either — restore it first.
        .where(and(eq(applications.id, data.applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)));

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
    // S-2: org-scoping alone is not enough — the target stage must belong to
    // the application's own job. Otherwise a caller could move an
    // application into a same-named (or any) stage of another job.
    const [application] = await db
        .select({ id: applications.id, job_id: applications.job_id })
        .from(applications)
        .where(and(eq(applications.id, data.applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)))
        .limit(1);
    if (!application) {
        return { error: true, message: "Application not found" };
    }

    const [targetStage] = await db
        .select({ id: stages.id, job_id: stages.job_id })
        .from(stages)
        .where(eq(stages.id, data.new_stage_id))
        .limit(1);
    if (!targetStage || targetStage.job_id !== application.job_id) {
        return { error: true, message: "Stage does not belong to this application's job" };
    }

    await db
        .update(applications)
        .set({ current_stage_id: data.new_stage_id })
        // Org-scoped: an application from another org is never moved.
        // A trashed application is never moved either — restore it first.
        .where(and(eq(applications.id, data.applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)));

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId,
    });

    return { success: true };
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
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .limit(1);
    if (!job) {
        return { success: false as const, message: "Job not found" };
    }

    const [candidate] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId), isNull(candidates.deleted_at)))
        .limit(1);
    if (!candidate) {
        return { success: false as const, message: "Candidate not found" };
    }

    const existing = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.job_id, jobId), eq(applications.candidate, candidateId), isNull(applications.deleted_at)))
        .limit(1);
    if (existing.length > 0) {
        return { success: false as const, message: "Candidate already has an application for this job" };
    }

    // No live application — clear a trashed one, if any, so the fresh
    // insert below is not rejected by the unique (job_id, candidate) index.
    await remove_trashed_application(jobId, candidateId, orgId);

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

// Sort for the applications list (?sort= URL param). The sort value rides
// in filterApplicationsSchema (src/zod.ts) as a raw string and is validated
// against this allowlist in the query — anything else falls back to
// newest-first.
export type ApplicationListSort = "newest" | "oldest" | "name-asc";

export const APPLICATION_LIST_SORTS: ApplicationListSort[] = ["newest", "oldest", "name-asc"];

export const get_job_all_applications = async (jobId: number, orgId: string) => {
    const cacheFn = dbCache(get_job_all_applications_db, {
        keyParts: ["job-applications", String(jobId), orgId],
        tags: [
            getIdTag(String(jobId), CACHE_TAGS.applications),
            getGlobalTag(CACHE_TAGS.applications),
            getOrgTag(orgId, CACHE_TAGS.applications),
        ],
    });

    return cacheFn(jobId, orgId);
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
                and(eq(applications.current_stage_id, stages.id), isNull(applications.deleted_at)),
            ),
        })
        .from(stages)
        // stages carry no org column — scope via their job. The count is a
        // correlated subquery, so no join to applications is needed; the old
        // leftJoin multiplied rows (one per application in the stage).
        // A trashed job's stages (and its trashed applications) are excluded.
        .innerJoin(job_listings, eq(stages.job_id, job_listings.id))
        .where(and(eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)));
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
            candidate_portfolio: candidates.portfolio_url,
            candidate_linkedin: candidates.linkedin_url,
            can_contact: applications.can_contact,
            // Collected on the public apply form (review/additional step).
            cover_letter: applications.cover_letter,
            referral_source: applications.referral_source,
            expected_salary: applications.expected_salary,
            earliest_start_date: applications.earliest_start_date,
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
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)));
};

export const get_all_applications_db = async (filter: z.infer<typeof filterApplicationsSchema>) => {
    const filters: SQL[] = [];

    if (filter.keywords && filter.keywords.length > 0) {
        // B10: keywords match the candidate name or the job title — the
        // old version only matched the job title, so searching for an
        // applicant by name silently returned nothing.
        const keywordFilters = filter.keywords.map(
            (keyword) => sql`(${candidates.name} LIKE ${`%${keyword}%`} OR ${job_listings.name} LIKE ${`%${keyword}%`})`,
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

    if (filter.stages && filter.stages.length > 0) {
        // filter.stages is always an array (multi-select) — match any of them.
        filters.push(inArray(stages.stage_name, filter.stages));
    }

    // B9: ?sort=: newest (default) / oldest / candidate name A–Z. Anything
    // outside the allowlist falls back to newest-first.
    const sort: ApplicationListSort | undefined = APPLICATION_LIST_SORTS.includes(filter.sort as ApplicationListSort)
        ? (filter.sort as ApplicationListSort)
        : undefined;
    const orderBy =
        sort === "oldest"
            ? asc(applications.created_at)
            : sort === "name-asc"
                ? asc(candidates.name)
                : desc(applications.created_at);

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
        .leftJoin(departments, eq(job_listings.department, departments.id))
        .leftJoin(candidates, eq(applications.candidate, candidates.id))
        .leftJoin(stages, eq(applications.current_stage_id, stages.id))
        .where(and(...filters, eq(applications.organization, filter.organization), isNull(applications.deleted_at)));

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
        .where(and(...filters, eq(job_listings.organization, filter.organization), isNull(applications.deleted_at)))
        .orderBy(orderBy)
        .limit(filter.limit!)
        .offset(filter.offset!);

    return [count, application];
};

export const get_job_all_applications_db = async (jobId: number, orgId: string) => {
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
        // Org-scoped (B20): a job id alone must never leak another org's
        // applications — the caller passes the session org.
        .where(and(eq(applications.job_id, jobId), eq(applications.organization, orgId), isNull(applications.deleted_at)))
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
}: z.infer<typeof moveAndReorderApplicationSchema>, orgId: string) {
    try {
        await db.transaction(async (tx) => {
            // S-3: resolve the application's org first and assert it matches
            // the session org — the old code updated by applicationId alone.
            // A trashed application cannot be moved — restore it first.
            const [application] = await tx
                .select({ id: applications.id, organization: applications.organization, job_id: applications.job_id })
                .from(applications)
                .where(and(eq(applications.id, applicationId), isNull(applications.deleted_at)))
                .limit(1);
            if (!application || application.organization !== orgId) {
                throw new Error("Application not found");
            }

            // The target stage must belong to the application's own job (S-2).
            const [targetStage] = await tx
                .select({ id: stages.id, job_id: stages.job_id })
                .from(stages)
                .where(eq(stages.id, newStageId))
                .limit(1);
            if (!targetStage || targetStage.job_id !== application.job_id) {
                throw new Error("Stage does not belong to this application's job");
            }

            // 1. Update stage (only if moving)
            if (sourceStageId && sourceStageId !== newStageId) {
                await tx
                    .update(applications)
                    .set({ current_stage_id: newStageId })
                    .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)));
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
                            eq(applications.organization, orgId),
                            isNull(applications.deleted_at),
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
                            eq(applications.organization, orgId),
                            isNull(applications.deleted_at),
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

// ── Delete application (B21) — soft-delete (Trash) ─────────────────────────
// Sets deleted_at (now) on the application row only — the candidate is
// untouched (they may have other applications). The application's
// interviews and scorecards stay in place, invisible while the application
// is trashed, so a restore brings them back; its Mongo application notes
// likewise stay until a permanent delete. The old hard delete lives on as
// permanent_delete_application_db below and is only reachable from Trash.
export const delete_application_db = async (applicationId: number, orgId: string) => {
    const [application] = await db
        .select({ id: applications.id, job_id: applications.job_id, candidate: applications.candidate })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)))
        .limit(1);
    if (!application) {
        return { success: false as const, message: "Application not found" };
    }

    await db
        .update(applications)
        .set({ deleted_at: new Date() })
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)));

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(applicationId),
        orgId,
    });
    revalidateDbCache({
        tag: CACHE_TAGS.jobs,
        id: String(application.job_id),
        orgId,
    });

    return { success: true as const, application };
};

// Permanent delete (Trash → Delete forever): the old hard-delete behaviour.
// Cascade (verified against src/drizzle/schema.ts):
//   • interviews.applications_id FK is onDelete: 'cascade' and
//     score_cards.interviews_id FK is onDelete: 'cascade', so deleting the
//     application row would cascade — but the deletes below are explicit so
//     the outcome does not depend on FK enforcement.
//   • DELETED: the application row, its interviews, their scorecards, and
//     its Mongo application notes (note_id `application_<id>`).
//   • KEPT: the candidate row and the candidate's attachments (both belong
//     to the candidate, who may have other applications). The candidate's
//     Mongo candidate-details record is likewise kept.
//   • applications.candidate FK is onDelete: 'cascade' in the other
//     direction (deleting a candidate deletes its applications) — deleting
//     an application never touches the candidate.
export const permanent_delete_application_db = async (applicationId: number, orgId: string) => {
    const [application] = await db
        .select({ id: applications.id, job_id: applications.job_id, candidate: applications.candidate })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNotNull(applications.deleted_at)))
        .limit(1);
    if (!application) {
        return { success: false as const, message: "Application not found" };
    }

    try {
        await db.transaction(async (tx) => {
            const interviewRows = await tx
                .select({ id: interviews.id })
                .from(interviews)
                .where(eq(interviews.applications_id, applicationId));
            const interviewIds = interviewRows.map((row) => row.id);

            if (interviewIds.length > 0) {
                await tx
                    .delete(score_cards)
                    .where(inArray(score_cards.interviews_id, interviewIds));
                await tx
                    .delete(interviews)
                    .where(eq(interviews.applications_id, applicationId));
            }

            await tx
                .delete(applications)
                .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)));
        });

        // Its directly-owned Mongo notes live outside the SQL transaction.
        await mongodb();
        await Note.deleteMany({ note_id: `application_${applicationId}` });

        revalidateDbCache({
            tag: CACHE_TAGS.applications,
            id: String(applicationId),
            orgId,
        });
        revalidateDbCache({
            tag: CACHE_TAGS.jobs,
            id: String(application.job_id),
            orgId,
        });

        return { success: true as const, application };
    } catch (err) {
        console.error("Delete application failed:", err);
        return { success: false as const, message: "Failed to delete application" };
    }
};