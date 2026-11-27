import "server-only";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { applications, candidates, interviews, job_listings } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { Permission, role_has_permission } from "@/lib/permissions";

export class AuthzError extends Error {
    constructor(message: string, public status: 401 | 403 | 404 = 403) {
        super(message);
        this.name = "AuthzError";
    }
}

export type OrgContext = {
    userId: string;
    orgId: string;
    orgRole: string | null;
};

/** Session user + active org. orgId ALWAYS comes from the Clerk session. */
export const getAuthContext = async (): Promise<OrgContext> => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) throw new AuthzError("Unauthorized", 401);
    return { userId, orgId, orgRole: orgRole ?? null };
};

/** Alias kept for existing call sites. */
export const getAuthOrThrow = getAuthContext;

/** Non-throwing permission check (returns false when signed out / no org). */
export const hasPermission = async (permission: Permission): Promise<boolean> => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) return false;
    return role_has_permission(orgRole!, permission);
};

/**
 * Throws unless the caller is signed in, has an active org and holds `permission`.
 * Returns the session context so callers never need to trust client orgId.
 */
export const requirePermission = async (permission: Permission): Promise<OrgContext> => {
    const ctx = await getAuthContext();
    if (!await role_has_permission(ctx.orgRole!, permission)) {
        throw new AuthzError(`Missing permission: ${permission}`, 403);
    }
    return ctx;
};

export const require_permission = requirePermission;

// ── Convenience checks (no arguments — session is implicit) ────────────────────
export const canCreateJob = () => hasPermission("job:create");
export const canEditJob = () => hasPermission("job:edit");
export const canDeleteJob = () => hasPermission("job:delete");
export const canViewJob = () => hasPermission("job:view");

export const canCreateCandidate = () => hasPermission("candidate:create");
export const canEditCandidate = () => hasPermission("candidate:edit");
export const canDeleteCandidate = () => hasPermission("candidate:delete");
export const canEvaluateCandidate = () => hasPermission("candidate:evaluate");
export const canViewCandidate = () => hasPermission("candidate:view");

export const canViewApplication = () => hasPermission("application:view");
export const canEditApplication = () => hasPermission("application:edit");
export const canMoveApplication = () => hasPermission("application:move");
export const canDeleteApplication = () => hasPermission("application:delete");

export const canScheduleInterview = () => hasPermission("interview:schedule");
// export const canManageInterviews = () => hasPermission("interview:manage");

export const canGenerateReport = () => hasPermission("report:generate");
export const canViewReport = () => hasPermission("report:view");

export const canInviteMember = () => hasPermission("member:invite");
export const canManageMember = () => hasPermission("member:manage");

// ── Tenant ownership assertions ────────────────────────────────────────────────
// Each throws a 404-style AuthzError so cross-tenant probes can't tell
// "exists in another org" from "doesn't exist".
export const assertJobBelongsToOrg = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select({ id: job_listings.id, name: job_listings.name, subdomain: job_listings.subdomain })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)))
        .limit(1);

    if (!job) throw new AuthzError("Job not found", 404);
    return job;
};

export const assertCandidateBelongsToOrg = async (candidateId: number, orgId: string) => {
    const [candidate] = await db
        .select({ id: candidates.id, name: candidates.name, email: candidates.email })
        .from(candidates)
        .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId)))
        .limit(1);

    if (!candidate) throw new AuthzError("Candidate not found", 404);
    return candidate;
};

export const assertApplicationBelongsToOrg = async (applicationId: number, orgId: string) => {
    const [application] = await db
        .select({
            id: applications.id,
            job_id: applications.job_id,
            candidate_id: applications.candidate,
            current_stage_id: applications.current_stage_id,
        })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId)))
        .limit(1);

    if (!application) throw new AuthzError("Application not found", 404);
    return application;
};

export const assertInterviewBelongsToOrg = async (interviewId: number, orgId: string) => {
    const [interview] = await db
        .select({ id: interviews.id })
        .from(interviews)
        .where(and(eq(interviews.id, interviewId), eq(interviews.organization, orgId)))
        .limit(1);

    if (!interview) throw new AuthzError("Interview not found", 404);
    return interview;
};
