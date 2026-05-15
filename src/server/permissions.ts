import {auth} from "@clerk/nextjs/server";
import {db} from "@/drizzle/db";
import {job_listings} from "@/drizzle/schema";
import {and, eq} from "drizzle-orm";

// ── Check if user can create a job ───────────────────────────────────────────────────────
export const canCreateJob = async (userId: string | null) => {
    // check if user id is valid
    if (userId == null) return false
    const {orgRole} = await auth();
    // check user role in clerk
    // return bool if user does or doesnt have role to add jobs
    const canCreate = orgRole === "org:admin";
    if (!canCreate) throw new Error(`You do not have permission to create a job`);
    return canCreate;
};

export const canEvaluateCandidate = () => {
};

export const canEditJob = () => {
};

// ── Auth guard helper ─────────────────────────────────────────────────────────
export const getAuthOrThrow = async () => {
    const {userId, orgId} = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");
    return {userId, orgId};
};

// ── Job ownership check ───────────────────────────────────────────────────────
export const assertJobBelongsToOrg = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select({id: job_listings.id})
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)))
        .limit(1);

    if (!job) throw new Error(`Job ${jobId} not found or does not belong to org`);
    return job;
};