import {db} from "@/drizzle/db";
import {applications, attachments, candidates, interviews, job_listings, scoreCards, stages} from "@/drizzle/schema";
import {and, eq, SQL} from "drizzle-orm";
import {CACHE_TAGS, dbCache, getGlobalTag, getIdTag, revalidateDbCache} from "@/lib/cache";
import {z} from "zod";
import {filterCandidateType, newCandidateForm} from "@/zod";

export const create_candidate = async (data: z.infer<typeof newCandidateForm>) => {
    const [candidate] = await db.insert(candidates).values({...data, cv_path: data.resume as string}).$returningId();
    revalidateDbCache({
        tag: CACHE_TAGS.candidates,
    });
    return candidate;
};

export const get_all_candidates = async (filter: z.infer<typeof filterCandidateType>) => {
    const cacheFn = dbCache(get_all_candidates_db, {
        tags: [
            getGlobalTag(CACHE_TAGS.candidates)
        ]
    });
    return cacheFn(filter);
};

export const get_candidate_by_id = async (unsafedata: number) => {
    const cacheFn = dbCache(get_candidate_by_id_db, {
        tags: [
            getIdTag(String(unsafedata), CACHE_TAGS.candidates)
        ]
    });
    return cacheFn(unsafedata);
};

export const get_candidate_by_id_db = async (unsafedata: number) => {
   const [
        candidate,
        application,
        attachment,
        interview,
        scoreCard,
    ] = await Promise.all([
        db.select().from(candidates).where(eq(candidates.id, unsafedata)),
        db.select().from(applications).where(eq(applications.candidate, unsafedata)),
        db.select().from(attachments).where(eq(attachments.candidate_id, unsafedata)),
        db.select().from(interviews).where(eq(interviews.applications_id, unsafedata)),
        db.select().from(scoreCards).where(eq(scoreCards.interviews_id, unsafedata)),
    ]);

    return {
        candidate: candidate[0],
        application,
        attachment,
        interview,
        scoreCard,
    };
};

const get_all_candidates_db = async (filter: z.infer<typeof filterCandidateType>) => {
    const filters: SQL[] = []

    if (filter?.name) filters.push(eq(candidates.name, filter.name));

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
        .leftJoin(applications, eq(applications.candidate, candidates.id))
        .leftJoin(attachments, eq(attachments.candidate_id, candidates.id))
        .where(and(...filters))
        .limit(filter.limit)
        .offset(filter.offset);

    const len = candidate.length
    return [len, candidate];
};
