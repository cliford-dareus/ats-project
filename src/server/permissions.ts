import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { job_listings } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { Permission, ROLE_PERMISSIONS } from "@/lib/permissions";


export const getAuthContext = async () => {
    const { userId, orgId, orgRole, has } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    return { userId, orgId, orgRole, has };
}

/** Fast check using the permission map */
export const hasPermission = async (permission: Permission): Promise<boolean> => {
    const { orgRole } = await getAuthContext();
    if (!orgRole) return false;
    return ROLE_PERMISSIONS[orgRole]?.includes(permission) ?? false;
}

/** Throws if the user lacks the permission (use in server actions) */
export const requirePermission = async (permission: Permission) => {
    const allowed = await hasPermission(permission);
    if (!allowed) {
        throw new Error(`Missing permission: ${permission}`);
    }
}

// ── Check if user can create a job ───────────────────────────────────────────────────────
export const canCreateJob = () => hasPermission("job:create");
export const canEditJob = () => hasPermission("job:edit");
export const canDeleteJob = () => hasPermission("job:delete");

export const canCreateCandidate = () => hasPermission("candidate:create");
export const canEditCandidate = () => hasPermission("candidate:edit");
export const canEvaluateCandidate = () => hasPermission("candidate:evaluate");

export const canMoveApplication = () => hasPermission("application:move");

export const canScheduleInterview = () => hasPermission("interview:schedule");
// export const canManageInterviews = () => hasPermission("interview:manage");

// export const canManageOrganizations = () => hasPermission("organization:manage");

export const canGenerateReport = () => hasPermission("report:generate");
export const canViewReport = () => hasPermission("report:view");

export const canInviteMember = () => hasPermission("member:invite");
export const canManageMember = () => hasPermission("member:manage")

// ── Auth guard helper ─────────────────────────────────────────────────────────
export const getAuthOrThrow = async () => {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    return { userId, orgId };
};

// ── Job ownership check ───────────────────────────────────────────────────────
export const assertJobBelongsToOrg = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select({ id: job_listings.id })
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)))
        .limit(1);

    if (!job) throw new Error(`Job ${jobId} not found or does not belong to org`);
    return job;
};
