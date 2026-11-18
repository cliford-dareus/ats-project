import { db } from "@/drizzle/db";
import { applications, attachments, candidates, interviews } from "@/drizzle/schema";
import { and, eq, inArray, sql, SQL } from "drizzle-orm";
import { CACHE_TAGS, dbCache, getGlobalTag, getIdTag, getOrgTag, revalidateDbCache } from "@/lib/cache";
import { filterCandidateSchema, newCandidateFormSchema, updateCandidateSchema } from "@/zod";
import { z } from "zod";

// organization/subdomain are required here — the action always fills them
// from the session org before calling.
export const create_candidate = async (data: z.infer<typeof newCandidateFormSchema> & { organization: string; subdomain: string }) => {
    // `resume` is a form field, not a candidates column — keep it out of the
    // insert (it maps to cv_path below).
    const { resume, ...candidateData } = data;
    const [candidate] = await db.insert(candidates)
        .values({
            ...candidateData,
            // Resume is optional for dashboard quick-add (attach later);
            // cv_path is NOT NULL so default to an empty string.
            cv_path: resume ?? "",
            organization: data.organization,
            subdomain: data.subdomain,
            // The quick-add form collects a single free-text location, not a
            // postal address — but address/city/state/zip_code are NOT NULL,
            // so default them the same way as cv_path.
            address: "",
            city: "",
            state: "",
            zip_code: "",
        })
        .$returningId();
    
    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
        id: String(candidate.id),
        orgId: String(data.organization),
    });
    return candidate;
};

export const update_candidate = async (data: z.infer<typeof updateCandidateSchema>, orgId: string) => {
    await db.update(candidates)
        .set({
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.phone && { phone: data.phone }),
            ...(data.location && { location: data.location }),
            ...(data.cv_path && { cv_path: data.cv_path as string }),
            ...(data.status && { status: data.status }),
            // ...(data.profession && { profession: data.profession }),
            ...(data.subdomain && { subdomain: data.subdomain }),
        })
        // Org-scoped: a candidate from another org is never updated.
        .where(and(eq(candidates.id, data.id), eq(candidates.organization, orgId)))

    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
        id: String(data.id),
        orgId: orgId,
    });
};

export const delete_candidate = async (id: number, orgId: string) => {
    await db.delete(candidates)
        .where(and(eq(candidates.id, id), eq(candidates.organization, orgId)))

    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
        id: String(id),
        orgId: orgId,
    });
};

export const get_all_candidates = async (filter: z.infer<typeof filterCandidateSchema>) => {
    const cacheFn = dbCache(get_all_candidates_db, {
        keyParts: ["candidates", filter.organization, JSON.stringify(filter)],
        tags: [
            getOrgTag(filter.organization, CACHE_TAGS.candidates),
            getGlobalTag(CACHE_TAGS.candidates)
        ]
    });
    return cacheFn(filter);
};

export const get_candidate_by_id = async (unsafedata: number, orgId: string) => {
    const cacheFn = dbCache(get_candidate_by_id_db, {
        tags: [
            getIdTag(String(unsafedata), CACHE_TAGS.candidates),
            getOrgTag(orgId, CACHE_TAGS.candidates),
        ]
    });
    // orgId is passed through to the DB query (and becomes part of the
    // unstable_cache key via the args), not just used for cache tags.
    return cacheFn(unsafedata, orgId);
};

export const get_candidate_by_id_db = async (unsafedata: number, orgId: string) => {
    const [
        candidate,
        application,
        attachment,
        interview,
        // scoreCard,
    ] = await Promise.all([
        db.select().from(candidates).where(and(eq(candidates.id, unsafedata), eq(candidates.organization, orgId))),
        db.select().from(applications).where(and(eq(applications.candidate, unsafedata), eq(applications.organization, orgId))),
        // Attachments carry no org column — scope them through their candidate.
        // Columns are selected explicitly so the join keeps the row shape.
        db.select({
            id: attachments.id,
            file_name: attachments.file_name,
            file_url: attachments.file_url,
            candidate_id: attachments.candidate_id,
            attachment_type: attachments.attachment_type,
        })
            .from(attachments)
            .innerJoin(candidates, eq(candidates.id, attachments.candidate_id))
            .where(and(eq(attachments.candidate_id, unsafedata), eq(candidates.organization, orgId))),
        // Interviews belong to applications, not candidates — join through the
        // candidate's applications so the review page shows this candidate's
        // interviews (matching applications_id against the candidate id
        // returned whatever interview happened to share the numeric id).
        db.select({
            id: interviews.id,
            applications_id: interviews.applications_id,
            locations: interviews.locations,
            start_at: interviews.start_at,
            end_at: interviews.end_at,
            type: interviews.type,
            organization: interviews.organization,
            link: interviews.link,
            status: interviews.status,
            hold_status: interviews.hold_status,
            hold_expires_at: interviews.hold_expires_at,
            interviewer_ids: interviews.interviewer_ids,
            created_at: interviews.created_at,
            updated_at: interviews.updated_at,
        })
            .from(interviews)
            .innerJoin(applications, eq(applications.id, interviews.applications_id))
            .where(and(eq(applications.candidate, unsafedata), eq(applications.organization, orgId))),
        // db.select().from(scoreCards).where(eq(scoreCards.interviews_id, unsafedata)),
    ]);

    return {
        candidate: candidate[0],
        application,
        attachment,
        interview,
        // scoreCard,
    };
};

const get_all_candidates_db = async (filter: z.infer<typeof filterCandidateSchema>) => {
    const filters: SQL[] = []

    if (filter.keywords && filter.keywords.length > 0) {
        const keywordFilters = filter.keywords.map(keyword =>
            sql`${candidates.name} LIKE ${`%${keyword}%`}`
        );
        filters.push(sql`(${sql.join(keywordFilters, sql` OR `)})`);
    }

    if (filter.location) {
        const locations = Array.isArray(filter.location) ? filter.location : [filter.location];
        filters.push(inArray(candidates.location, locations));
    }

    // if (filter.experience) {
    //     filters.push(inArray(candidates.experience, filter.experience));
    // }

    if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        filters.push(inArray(candidates.status, statuses));
    }

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(candidates)
        .where(and(...filters, eq(candidates.organization, filter.organization)));

    const candidate = await db.select({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        cv_path: candidates.cv_path,
        status: candidates.status,
        created_at: candidates.created_at,
        updated_at: candidates.updated_at,

        applicationsCount: db.$count(
            applications,
            eq(applications.candidate, candidates.id),
        ),
        attachmentsCount: db.$count(
            attachments,
            eq(attachments.candidate_id, candidates.id),
        ),
    })
        .from(candidates)
        .where(and(...filters, eq(candidates.organization, filter.organization)))
        .limit(filter.limit)
        .offset(filter.offset);

    return [count, candidate];
};
