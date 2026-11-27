import "server-only";

import { auth } from "@clerk/nextjs/server";
import { Permission, role_has_permission } from "@/lib/permissions";
import { AuthzError } from "./org-asserts";

// Tenant ownership assertions live in ./org-asserts (worker-safe: no
// server-only, no Clerk) and are re-exported here so existing importers
// keep importing from @/server/permissions unchanged.
export {
    AuthzError,
    assertApplicationBelongsToOrg,
    assertCandidateBelongsToOrg,
    assertInterviewBelongsToOrg,
    assertJobBelongsToOrg,
} from "./org-asserts";

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
export const canCancelInterview = () => hasPermission("interview:cancel");
// export const canManageInterviews = () => hasPermission("interview:manage");

export const canGenerateReport = () => hasPermission("report:generate");
export const canViewReport = () => hasPermission("report:view");

export const canInviteMember = () => hasPermission("member:invite");
export const canManageMember = () => hasPermission("member:manage");
