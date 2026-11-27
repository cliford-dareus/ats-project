'use server';

import { auth } from "@clerk/nextjs/server";
import { role_has_permission } from "@/lib/permissions";
import {
    EMPTY_GLOBAL_SEARCH_RESULTS,
    GLOBAL_SEARCH_MAX_LENGTH,
    GLOBAL_SEARCH_MIN_LENGTH,
    search_global_db,
    type GlobalSearchResults,
} from "@/server/queries/drizzle/global-search";

/**
 * Global search server action.
 *
 * orgId always comes from the Clerk session — the client only sends the
 * query string, never an org id. Each result group is gated on its own
 * existing view permission (job:view / candidate:view / application:view);
 * groups the caller may not view come back empty, so a restricted role
 * can never learn that a matching row exists. No new permissions added.
 *
 * Returns empty groups (not an error) for unauthenticated callers and for
 * queries shorter than 2 characters, so the response never reveals
 * whether a row exists.
 */
export const global_search_action = async (
    unsafeQuery: string
): Promise<GlobalSearchResults> => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId || !orgRole) return EMPTY_GLOBAL_SEARCH_RESULTS;

    if (typeof unsafeQuery !== "string") return EMPTY_GLOBAL_SEARCH_RESULTS;
    const query = unsafeQuery.trim();
    if (
        query.length < GLOBAL_SEARCH_MIN_LENGTH ||
        query.length > GLOBAL_SEARCH_MAX_LENGTH
    ) {
        return EMPTY_GLOBAL_SEARCH_RESULTS;
    }

    const [canViewJobs, canViewCandidates, canViewApplications] =
        await Promise.all([
            role_has_permission(orgRole, "job:view"),
            role_has_permission(orgRole, "candidate:view"),
            role_has_permission(orgRole, "application:view"),
        ]);

    if (!canViewJobs && !canViewCandidates && !canViewApplications) {
        return EMPTY_GLOBAL_SEARCH_RESULTS;
    }

    return search_global_db(orgId, query, {
        includeJobs: canViewJobs,
        includeCandidates: canViewCandidates,
        includeApplications: canViewApplications,
    });
};
