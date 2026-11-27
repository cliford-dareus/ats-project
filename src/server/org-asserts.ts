// ─────────────────────────────────────────────────────────────────────────────
// Worker-safe tenant ownership assertions.
//
// This module deliberately has NO `import "server-only"` and NO Clerk
// import: the BullMQ worker runs under plain tsx, where `server-only`
// throws at import time, so anything the worker needs must live here —
// not in src/server/permissions.ts (which keeps the marker because it
// reads the Clerk session). permissions.ts re-exports everything here,
// so server-side importers keep importing from @/server/permissions
// unchanged; the worker imports from THIS file directly.
//
// The asserts are pure DB reads (org + id, trashed rows read as not
// found) — no session, no roles — so they are safe to run in either
// context. Each throws a 404-style AuthzError so cross-tenant probes
// can't tell "exists in another org" from "doesn't exist".
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@/drizzle/db";
import { applications, candidates, interviews, job_listings } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";

export class AuthzError extends Error {
    constructor(message: string, public status: 401 | 403 | 404 = 403) {
        super(message);
        this.name = "AuthzError";
    }
}

export const assertJobBelongsToOrg = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select({ id: job_listings.id, name: job_listings.name, subdomain: job_listings.subdomain })
        .from(job_listings)
        // A trashed job reads as not found — no action (edit, delete,
        // automation, scheduling) can target it until it is restored.
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId), isNull(job_listings.deleted_at)))
        .limit(1);

    if (!job) throw new AuthzError("Job not found", 404);
    return job;
};

export const assertCandidateBelongsToOrg = async (candidateId: number, orgId: string) => {
    const [candidate] = await db
        .select({ id: candidates.id, name: candidates.name, email: candidates.email })
        .from(candidates)
        // A trashed candidate reads as not found until restored.
        .where(and(eq(candidates.id, candidateId), eq(candidates.organization, orgId), isNull(candidates.deleted_at)))
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
        // A trashed application reads as not found until restored — so
        // automations, moves and interview scheduling never run on one.
        .where(and(eq(applications.id, applicationId), eq(applications.organization, orgId), isNull(applications.deleted_at)))
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
