"use server";

// ─────────────────────────────────────────────────────────────────────────────
// Public trigger dispatch as a server action.
//
// The public career pages (bridge.apliko.com, hisgra.apliko.com, …) used to
// POST to /api/trigger/public directly from the browser, which forced the
// shared trigger secret into a NEXT_PUBLIC_ env var — i.e. shipped to every
// visitor in the client bundle. This action replaces that call: the browser
// only sends the event + context, and all verification + queueing happens
// server-side. No secret is involved at all.
//
// Mirrors the checks in src/app/api/trigger/public/route.ts:
//   1. zod-validate event + context (only candidate_applied / resume_uploaded)
//   2. resolve the org from the subdomain — never trust a client orgId
//   3. verify the job belongs to that org
//   4. verify the candidate (when supplied) belongs to that org
//   5. enqueue via enqueueTrigger with the DB-resolved org id
//
// Never throws — the apply form fires this fire-and-forget, and a failed
// integration must never block the applicant.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { db } from "@/drizzle/db";
import { eq, and } from "drizzle-orm";
import { candidates, job_listings, organization } from "@/drizzle/schema";
import { enqueueTrigger } from "@/lib/enqueue-trigger";
import { ATSContext } from "@/types";

// ── Validation (mirrors /api/trigger/public) ─────────────────────────────────
const PublicEventSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("candidate_applied"),
        candidateId: z.string().min(1),
        jobId: z.string().min(1),
    }),
    z.object({
        type: z.literal("resume_uploaded"),
        candidateId: z.string().min(1),
        fileUrl: z.string().url(),
    }),
]);

const PublicContextSchema = z.object({
    subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
    jobId: z.number().min(1),
    candidate: z.object({
        id: z.number().min(1),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        cv_path: z.string().min(1).optional(),
    }).optional(),
    job: z.object({
        id: z.number().min(1),
        job_name: z.string().min(1).optional(),
        job_description: z.string().min(1).optional(),
        department: z.string().default(""),
    }).optional(),
    settings: z.record(z.unknown()).default({}),
});

const RequestSchema = z.object({
    event: PublicEventSchema,
    context: PublicContextSchema,
});

type FirePublicTriggerResult =
    | { ok: true; jobId: string }
    | { ok: false; error: string };

export async function fire_public_trigger_action(
    unsafeInput: unknown
): Promise<FirePublicTriggerResult> {
    try {
        const parsed = RequestSchema.safeParse(unsafeInput);
        if (!parsed.success) {
            console.warn("[trigger-action] Validation failed", parsed.error.flatten());
            return { ok: false, error: "Validation failed" };
        }

        const { event, context } = parsed.data;

        // ── 1. Resolve org from subdomain (never from client) ────────────────
        const [org] = await db
            .select({ orgId: organization.clerk_id, orgName: organization.name })
            .from(organization)
            .where(eq(organization.subdomain, context.subdomain))
            .limit(1);

        if (!org) {
            console.warn("[trigger-action] Organization not found", context.subdomain);
            return { ok: false, error: "Organization not found" };
        }

        // ── 2. Verify job belongs to this org ────────────────────────────────
        const [job] = await db
            .select({
                job_id: job_listings.id,
                job_name: job_listings.name,
                job_description: job_listings.description,
                job_subdomain: job_listings.subdomain,
            })
            .from(job_listings)
            .where(and(eq(job_listings.id, context.jobId), eq(job_listings.organization, org.orgId)))
            .limit(1);

        if (!job) {
            console.warn("[trigger-action] Job not found or wrong org", context.jobId);
            return { ok: false, error: "Job not found" };
        }

        // ── 3. Verify candidate belongs to this org (when supplied) ──────────
        if (context.candidate?.id) {
            const [candidate] = await db
                .select({ id: candidates.id })
                .from(candidates)
                .where(and(eq(candidates.id, context.candidate.id), eq(candidates.organization, org.orgId)))
                .limit(1);

            if (!candidate) {
                console.warn("[trigger-action] Candidate not found or wrong org", context.candidate.id);
                return { ok: false, error: "Candidate not found" };
            }
        }

        // ── 4. Build context — orgId from DB, job from DB ────────────────────
        const atsContext: ATSContext = {
            organization_id: org.orgId,
            user_id: "system", // no user on public pages
            candidate: context.candidate,
            job: job,
            settings: context.settings,
        };

        const jobId = await enqueueTrigger({
            event,
            context: { ...atsContext, subdomain: job.job_subdomain as string },
        });

        return { ok: true, jobId };
    } catch (error) {
        console.error("[trigger-action] Failed to dispatch trigger", error);
        return { ok: false, error: "Failed to dispatch trigger" };
    }
}
