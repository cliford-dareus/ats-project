import { db } from "@/drizzle/db";
import { applications, candidates, job_listings } from "@/drizzle/schema";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

/**
 * Global search (dashboard-wide, org-scoped).
 *
 * Searches jobs (by title), candidates (by name/email) and applications
 * (by candidate name + job title) — the three entity types the global
 * search covers. Every query is scoped to the caller's org id, which the
 * server action takes from the Clerk session, never from the client.
 *
 * Applications are matched through joins, so the joined candidate/job rows
 * are re-checked against the same org: a joined row from another org can
 * never make its application surface (the `or(isNull(...), eq(...))`
 * guards keep the LEFT JOIN nullable while still excluding foreign rows).
 *
 * LIKE wildcards (`%`, `_`, `\`) are stripped from the search term so a
 * user-typed wildcard can never broaden the match. MySQL LIKE is
 * case-insensitive under the default collation, matching the existing
 * per-page list search behaviour.
 */

export const GLOBAL_SEARCH_LIMIT_PER_GROUP = 5;
export const GLOBAL_SEARCH_MIN_LENGTH = 2;
export const GLOBAL_SEARCH_MAX_LENGTH = 100;

export type GlobalSearchJobResult = {
    id: number;
    title: string;
    location: string;
    status: "OPEN" | "CLOSED" | "DRAFT" | "ARCHIVED" | "PENDING" | null;
};

export type GlobalSearchCandidateResult = {
    id: number;
    name: string;
    email: string;
};

export type GlobalSearchApplicationResult = {
    id: number;
    candidateId: number | null;
    candidateName: string | null;
    jobId: number | null;
    jobTitle: string | null;
};

export type GlobalSearchResults = {
    jobs: GlobalSearchJobResult[];
    candidates: GlobalSearchCandidateResult[];
    applications: GlobalSearchApplicationResult[];
};

export const EMPTY_GLOBAL_SEARCH_RESULTS: GlobalSearchResults = {
    jobs: [],
    candidates: [],
    applications: [],
};

/** Strip LIKE wildcards and trim; returns null when nothing searchable remains. */
const sanitizeSearchTerm = (query: string): string | null => {
    const term = query.replace(/[%_\\]/g, "").trim();
    if (term.length < GLOBAL_SEARCH_MIN_LENGTH) return null;
    return term.slice(0, GLOBAL_SEARCH_MAX_LENGTH);
};

export type GlobalSearchGroups = {
    includeJobs?: boolean;
    includeCandidates?: boolean;
    includeApplications?: boolean;
};

export const search_global_db = async (
    orgId: string,
    query: string,
    groups: GlobalSearchGroups = {}
): Promise<GlobalSearchResults> => {
    const {
        includeJobs = true,
        includeCandidates = true,
        includeApplications = true,
    } = groups;

    const term = sanitizeSearchTerm(query);
    if (!term) return EMPTY_GLOBAL_SEARCH_RESULTS;

    const pattern = `%${term}%`;

    const [jobRows, candidateRows, applicationRows] = await Promise.all([
        includeJobs
            ? db
                  .select({
                      id: job_listings.id,
                      title: job_listings.name,
                      location: job_listings.location,
                      status: job_listings.status,
                  })
                  .from(job_listings)
                  .where(
                      and(
                          eq(job_listings.organization, orgId),
                          sql`${job_listings.name} LIKE ${pattern}`
                      )
                  )
                  .orderBy(desc(job_listings.created_at))
                  .limit(GLOBAL_SEARCH_LIMIT_PER_GROUP)
            : Promise.resolve([] as GlobalSearchJobResult[]),
        includeCandidates
            ? db
                  .select({
                      id: candidates.id,
                      name: candidates.name,
                      email: candidates.email,
                  })
                  .from(candidates)
                  .where(
                      and(
                          eq(candidates.organization, orgId),
                          or(
                              sql`${candidates.name} LIKE ${pattern}`,
                              sql`${candidates.email} LIKE ${pattern}`
                          )
                      )
                  )
                  .orderBy(desc(candidates.created_at))
                  .limit(GLOBAL_SEARCH_LIMIT_PER_GROUP)
            : Promise.resolve([] as GlobalSearchCandidateResult[]),
        includeApplications
            ? db
                  .select({
                      id: applications.id,
                      candidateId: candidates.id,
                      candidateName: candidates.name,
                      jobId: job_listings.id,
                      jobTitle: job_listings.name,
                  })
                  .from(applications)
                  .leftJoin(candidates, eq(applications.candidate, candidates.id))
                  .leftJoin(job_listings, eq(applications.job_id, job_listings.id))
                  .where(
                      and(
                          eq(applications.organization, orgId),
                          or(
                              sql`${candidates.name} LIKE ${pattern}`,
                              sql`${job_listings.name} LIKE ${pattern}`
                          ),
                          // Joined rows must belong to the same org (or be
                          // absent via the LEFT JOIN) — never another org.
                          or(
                              isNull(candidates.id),
                              eq(candidates.organization, orgId)
                          ),
                          or(
                              isNull(job_listings.id),
                              eq(job_listings.organization, orgId)
                          )
                      )
                  )
                  .orderBy(desc(applications.created_at))
                  .limit(GLOBAL_SEARCH_LIMIT_PER_GROUP)
            : Promise.resolve([] as GlobalSearchApplicationResult[]),
    ]);

    return { jobs: jobRows, candidates: candidateRows, applications: applicationRows };
};
