//   Called exclusively from the (public) career page group:
//   bridge.apliko.com  →  POST https://app.apliko.com/api/ats/trigger/public
//   hisgra.apliko.com  →  POST https://app.apliko.com/api/ats/trigger/public
//
//   Auth: shared secret via x-trigger-secret header (no Clerk — public pages have no session)
//   Scope: candidate_applied + resume_uploaded only — the two events a public page can fire
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

import { optional, z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { pluginRegistry } from "@/lib/plugin-registry";

// ── DB import — replace with your actual query ────────────────────────────────
import { db } from "@/drizzle/db";
import { eq, and } from "drizzle-orm";
import { applications, job_listings, organization } from "@/drizzle/schema";
import { ATSContext, TriggerEvent } from "@/types";
import { initializePluginSystemServer } from "@/lib/initialize-plugins";

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIGGER_SECRET = process.env.INTERNAL_TRIGGER_SECRET!;
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "apliko.com";

// ── Validation ────────────────────────────────────────────────────────────────
// Only the two events a public career page can legitimately fire.
// stage_changed, offer_extended etc. can only be fired from the authenticated dashboard.
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
    // subdomain is the org slug — "bridge" | "hisgra" | "braky"
    // used to look up the org in the DB and verify it exists
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

interface ScorePayload {
    score: number;
    breakdown: { fit: number; skills: number; experience: number };
    summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function verifySecret(req: NextRequest): boolean {
    if (!TRIGGER_SECRET) {
        console.error("[trigger/public] INTERNAL_TRIGGER_SECRET is not set");
        return false;
    }
    const header = req.headers.get("x-trigger-secret");
    // Constant-time comparison to prevent timing attacks
    if (!header || header.length !== TRIGGER_SECRET.length) return false;
    let mismatch = 0;
    for (let i = 0; i < header.length; i++) {
        mismatch |= header.charCodeAt(i) ^ TRIGGER_SECRET.charCodeAt(i);
    }
    return mismatch === 0;
}

function verifyOrigin(req: NextRequest): boolean {
    const origin = req.headers.get("origin") ?? "";
    if (!origin) return true; // server-to-server has no origin — allow

    try {
        const url = new URL(origin);
        const hostname = url.hostname;

        // Must come from *.apliko.com or *.apliko.localhost (dev)
        return (
            hostname.endsWith(`.${ROOT_DOMAIN}`) ||
            hostname.endsWith(`.apliko.localhost`) ||
            hostname === "localhost"
        );
    } catch {
        return false;
    }
}

// Looks up the org by subdomain slug.
// Returns { orgId, orgName } or null if not found.
async function getOrgBySubdomain(
    subdomain: string,
): Promise<{ orgId: string; orgName: string } | null> {
    const [org] = await db
        .select({ orgId: organization.clerk_id, orgName: organization.name })
        .from(organization)
        .where(eq(organization.subdomain, subdomain))
        .limit(1);
    return org ?? null;
}

// Verifies the job belongs to this org — prevents firing triggers
// for a job that belongs to a different org.
async function verifyJobBelongsToOrg(
    jobId: string,
    orgId: string,
): Promise<[boolean, { id: number, job_name: string, job_description: string }]> {

    const [job] = await db
        .select({ id: job_listings.id, name: job_listings.name, description: job_listings.description })
        .from(job_listings)
        .where(and(eq(job_listings.id, Number(jobId)), eq(job_listings.organization, orgId)))
        .limit(1);
    return [!!job, job];
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function corsHeaders(req: NextRequest): HeadersInit {
    const origin = req.headers.get("origin");
    if (!origin) return {};
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-trigger-secret",
        "Access-Control-Allow-Credentials": "false", // no cookies on public route
        "Vary": "Origin",
    };
}

// ── Preflight ─────────────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
    if (!verifyOrigin(req)) {
        return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const cors = corsHeaders(req);

    // ── 1. Origin check ────────────────────────────────────────────────────────
    if (!verifyOrigin(req)) {
        return NextResponse.json(
            { error: "Forbidden: unknown origin" },
            { status: 403, headers: cors },
        );
    }

    // ── 2. Secret verification ─────────────────────────────────────────────────
    if (!verifySecret(req)) {
        return NextResponse.json(
            { error: "Forbidden: invalid secret" },
            { status: 403, headers: cors },
        );
    }

    // ── 3. Parse + validate body ───────────────────────────────────────────────
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400, headers: cors },
        );
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 422, headers: cors },
        );
    }

    const { event, context } = parsed.data;

    // ── 4. Resolve org from subdomain ──────────────────────────────────────────
    // This is the critical security step — we never trust an orgId from the client.
    // The subdomain is the only identity signal from a public page.
    const org = await getOrgBySubdomain(context.subdomain);
    if (!org) {
        return NextResponse.json(
            { error: "Organization not found" },
            { status: 404, headers: cors },
        );
    }

    // ── Boot the registry for this org ────────────────────────────────────────
    await initializePluginSystemServer(org.orgId);

    // ── 5. Verify job belongs to this org ──────────────────────────────────────
    const [jobValid, job] = await verifyJobBelongsToOrg(String(context.jobId), org.orgId);
    if (!jobValid) {
        return NextResponse.json(
            { error: "Job not found" },
            { status: 404, headers: cors },
        );
    }

    // ── 6. Build context — orgId comes from DB, not client ────────────────────
    const atsContext: ATSContext = {
        organization_id: org.orgId,          // ← from DB lookup, never from request body
        user_id: "system",           // no user on public pages
        // jobId: context.jobId,
        candidate: context.candidate,
        job: job,
        settings: context.settings,
    };

    // ── 8. Dispatch plugins + automation rules in parallel ─────────────────────
    const [pluginSettled] = await Promise.allSettled([
        pluginRegistry.dispatch(event as TriggerEvent, atsContext),
    ]);

    const pluginResults =
        pluginSettled.status === "fulfilled" ? pluginSettled.value : [];

    const [fired_resume_score] = pluginResults.filter((result) => result.integrationId === "resume-score");
    const payload = fired_resume_score.result.data as ScorePayload;

    console.log("[trigger/public] fired_resume_score:", fired_resume_score);

    if (fired_resume_score.result.success) {
        await db
            .update(applications)
            .set({
                resume_score: payload.score,
                resume_score_fit: payload.breakdown.fit,
                resume_score_skills: payload.breakdown.skills,
                resume_score_exp: payload.breakdown.experience,
                resume_score_summary: payload.summary,
                resume_scored_at: new Date(),
                resume_score_model: fired_resume_score.result.metadata.model,
                updated_at: new Date(),
            })
            .where(and(
                eq(applications.id, context.settings.applicationId as number),
                eq(applications.organization, org.orgId)
            ));
    }

    if (pluginSettled.status === "rejected") {
        console.error("[trigger/public] pluginRegistry.dispatch failed:", pluginSettled.reason);
    }

    // ── 9. Respond ─────────────────────────────────────────────────────────────
    // Keep the response minimal — no internal data should leak to the public page.
    return NextResponse.json(
        {
            ok: true,
            fired: pluginResults.length,
        },
        { headers: cors },
    );
};
