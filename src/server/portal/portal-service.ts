// Server-only candidate portal service. Deliberately NOT "use server":
// these helpers run from server actions and from the public apply flow,
// never from the browser.
//
// Security model (mirrors the interview-hold hardening, with one deliberate
// difference):
//  - Portal tokens are randomBytes(32) hex (64 chars) and are stored ONLY
//    as a sha256 hex hash. The raw token is emailed once and never written
//    to the DB, a log, or an error message. (Hold tokens, by contrast, are
//    stored PLAINTEXT in interviews.hold_token.)
//  - Every portal lookup is scoped through the token's candidate_id. No
//    caller-supplied candidate/application id is ever trusted.
//  - Missing, revoked, expired, and trashed-candidate tokens all return
//    the SAME null — the caller can never tell them apart.
//  - Only one live token exists per candidate: creating a token revokes
//    all prior non-expired, non-revoked tokens for that candidate.
//  - Portal data never includes internal notes, feedback, scorecards,
//    salary/referral fields, or other candidates.

import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
    applications,
    candidate_portal_tokens,
    candidates,
    interviews,
    job_listings,
    organization,
    screening_answers,
    stages,
} from "@/drizzle/schema";
import { ROOT_DOMAIN } from "@/lib/marketing";
import { get_org_profile, send_org_email } from "@/server/email/org-mailer";

// ── Token format ──────────────────────────────────────────────────────────

/** Portal tokens are randomBytes(32) hex — reject anything else before hitting the DB. */
const PORTAL_TOKEN_RE = /^[a-f0-9]{64}$/;
const is_valid_portal_token = (token: string): boolean => PORTAL_TOKEN_RE.test(token);

/** sha256 hex of a raw token — the only form ever stored or compared. */
const hash_portal_token = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

// ── Token lifetime ────────────────────────────────────────────────────────
// 30 days. Interview holds use 48h because a hold is a single calendar
// decision with a deadline; a portal link is a standing "track my
// application" link the candidate may open weeks after applying, so it
// needs to live much longer. Revocation on re-issue (below) keeps the
// live-token window to one token per candidate regardless of lifetime.
const PORTAL_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Tokenized portal URL on the org's career host.
 *
 * Career URLs in this codebase are always `https://{subdomain}.{ROOT_DOMAIN}`
 * (see buildCareerApplyUrl in src/lib/job-display.ts and the org settings
 * page); the portal lives at /portal/[token] on that host — the token is a
 * path segment, matching src/app/(public)/[domain]/portal/[token]/page.tsx.
 */
export function build_portal_url(subdomain: string, token: string): string {
    return `https://${subdomain}.${ROOT_DOMAIN}/portal/${token}`;
}

/**
 * Create a fresh portal token for a candidate, revoking any prior live
 * tokens first so only one link works at a time. Returns the RAW token
 * (emailed once by the caller) and its expiry — the raw value is never
 * persisted. Throws when the candidate does not exist or is trashed.
 */
export async function create_portal_token(
    candidateId: number,
): Promise<{ token: string; expiresAt: Date }> {
    const [candidate] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(and(eq(candidates.id, candidateId), isNull(candidates.deleted_at)))
        .limit(1);
    if (!candidate) {
        throw new Error("Candidate not found or trashed");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_MS);
    const now = new Date();

    // Revoke prior live tokens first (non-expired, non-revoked).
    await db
        .update(candidate_portal_tokens)
        .set({ revoked_at: now })
        .where(
            and(
                eq(candidate_portal_tokens.candidate_id, candidateId),
                isNull(candidate_portal_tokens.revoked_at),
                gt(candidate_portal_tokens.expires_at, now),
            ),
        );

    // Store ONLY the hash — the raw token never touches the DB.
    await db.insert(candidate_portal_tokens).values({
        candidate_id: candidateId,
        token_hash: hash_portal_token(token),
        expires_at: expiresAt,
    });

    return { token, expiresAt };
}

// ── Portal data ───────────────────────────────────────────────────────────

export type PortalApplication = {
    id: number;
    jobTitle: string;
    orgName: string;
    stageName: string | null;
    status: string;
    appliedAt: Date | null;
    interviews: Array<{
        id: number;
        startAt: Date | null;
        endAt: Date | null;
        type: string | null;
        locations: string | null;
        link: string | null;
        status: string | null;
    }>;
    screeningAnswers: Array<{ questionText: string; answerText: string }>;
};

export type PortalData = {
    candidate: { id: number; name: string | null; email: string | null };
    orgName: string;
    subdomain: string;
    applications: PortalApplication[];
};

/**
 * Resolve a raw portal token to the candidate's portal data, or null.
 * Missing, revoked, expired, and trashed-candidate tokens all return the
 * SAME null — never a reason. Only live (non-trashed) applications are
 * returned, each with its job, current stage, interviews, and screening
 * answers. Internal notes, feedback, scorecards, salary/referral fields,
 * and other candidates are never included.
 */
export async function get_portal_data_by_token(token: string): Promise<PortalData | null> {
    if (!is_valid_portal_token(token)) return null;

    const [tokenRow] = await db
        .select({
            candidateId: candidate_portal_tokens.candidate_id,
            expiresAt: candidate_portal_tokens.expires_at,
            revokedAt: candidate_portal_tokens.revoked_at,
        })
        .from(candidate_portal_tokens)
        .where(eq(candidate_portal_tokens.token_hash, hash_portal_token(token)))
        .limit(1);

    // Same null for missing / revoked / expired — no enumeration hints.
    if (!tokenRow || tokenRow.revokedAt !== null || tokenRow.expiresAt <= new Date()) {
        return null;
    }

    const [candidate] = await db
        .select({
            id: candidates.id,
            name: candidates.name,
            email: candidates.email,
            organization: candidates.organization,
            subdomain: candidates.subdomain,
            status: candidates.status,
        })
        .from(candidates)
        .where(and(eq(candidates.id, tokenRow.candidateId), isNull(candidates.deleted_at)))
        .limit(1);
    if (!candidate) return null;

    const [org] = await db
        .select({ name: organization.name, subdomain: organization.subdomain })
        .from(organization)
        .where(eq(organization.clerk_id, candidate.organization))
        .limit(1);
    const orgName = org?.name ?? "Talent Team";
    const subdomain = org?.subdomain ?? candidate.subdomain;

    const appRows = await db
        .select({
            id: applications.id,
            jobId: applications.job_id,
            stageId: applications.current_stage_id,
            createdAt: applications.created_at,
        })
        .from(applications)
        .where(and(eq(applications.candidate, candidate.id), isNull(applications.deleted_at)))
        .orderBy(desc(applications.created_at));

    if (appRows.length === 0) {
        return {
            candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
            orgName,
            subdomain,
            applications: [],
        };
    }

    const appIds = appRows.map((a) => a.id);

    const [jobRows, stageRows, interviewRows, answerRows] = await Promise.all([
        db
            .select({ id: job_listings.id, name: job_listings.name })
            .from(job_listings)
            .where(
                inArray(
                    job_listings.id,
                    appRows.map((a) => a.jobId).filter((id): id is number => id !== null),
                ),
            ),
        db
            .select({ id: stages.id, name: stages.stage_name })
            .from(stages)
            .where(
                inArray(
                    stages.id,
                    appRows.map((a) => a.stageId).filter((id): id is number => id !== null),
                ),
            ),
        db
            .select({
                id: interviews.id,
                applicationId: interviews.applications_id,
                startAt: interviews.start_at,
                endAt: interviews.end_at,
                type: interviews.type,
                locations: interviews.locations,
                link: interviews.link,
                status: interviews.status,
            })
            .from(interviews)
            .where(inArray(interviews.applications_id, appIds))
            .orderBy(asc(interviews.start_at), asc(interviews.id)),
        db
            .select({
                applicationId: screening_answers.application_id,
                questionText: screening_answers.question_text,
                answerText: screening_answers.answer_text,
            })
            .from(screening_answers)
            .where(inArray(screening_answers.application_id, appIds))
            .orderBy(asc(screening_answers.sort_order), asc(screening_answers.id)),
    ]);

    const jobsById = new Map(jobRows.map((j) => [j.id, j.name]));
    const stagesById = new Map(stageRows.map((s) => [s.id, s.name]));
    const interviewsByApp = new Map<number, PortalApplication["interviews"]>();
    for (const iv of interviewRows) {
        if (iv.applicationId === null) continue;
        const list = interviewsByApp.get(iv.applicationId) ?? [];
        list.push({
            id: iv.id,
            startAt: iv.startAt,
            endAt: iv.endAt,
            type: iv.type,
            locations: iv.locations,
            link: iv.link,
            status: iv.status,
        });
        interviewsByApp.set(iv.applicationId, list);
    }
    const answersByApp = new Map<number, PortalApplication["screeningAnswers"]>();
    for (const a of answerRows) {
        const list = answersByApp.get(a.applicationId) ?? [];
        list.push({ questionText: a.questionText, answerText: a.answerText });
        answersByApp.set(a.applicationId, list);
    }

    // `status` is the candidate-level outcome (ACTIVE / REJECTED / HIRED):
    // applications have no status column — pipeline position is the stage
    // name. Salary, referral source, cover letter, and resume scores are
    // deliberately never selected here.
    const status = candidate.status ?? "ACTIVE";

    return {
        candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
        orgName,
        subdomain,
        applications: appRows.map((app) => ({
            id: app.id,
            jobTitle: app.jobId !== null ? (jobsById.get(app.jobId) ?? "Unknown role") : "Unknown role",
            orgName,
            stageName: app.stageId !== null ? (stagesById.get(app.stageId) ?? null) : null,
            status,
            appliedAt: app.createdAt,
            interviews: interviewsByApp.get(app.id) ?? [],
            screeningAnswers: answersByApp.get(app.id) ?? [],
        })),
    };
}

// ── Emailing portal links ─────────────────────────────────────────────────
// All portal mail goes through send_org_email — the always-available path
// (org Resend key → platform RESEND_API_KEY), NOT the plugin trigger path:
// the Resend confirmation integration only fires from the BullMQ worker
// when the org installed + authenticated Resend, and it never receives the
// candidate's email from the apply flow today, so it cannot send. See
// send_application_confirmation_with_portal_link below.

type PortalLinkMailInput = {
    candidateId: number;
    candidateName: string;
    candidateEmail: string;
    orgId: string;
    orgName: string;
    subdomain: string;
    subject: string;
    intro: string;
};

/** Create a fresh token and email its link. Never throws — returns failure. */
async function create_token_and_email_link(input: PortalLinkMailInput): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { token, expiresAt } = await create_portal_token(input.candidateId);
        const portalUrl = build_portal_url(input.subdomain, token);
        const result = await send_org_email({
            orgId: input.orgId,
            to: input.candidateEmail,
            toName: input.candidateName,
            subject: input.subject,
            text: [
                `Hi ${input.candidateName},`,
                "",
                input.intro,
                "",
                `Track your application here:`,
                portalUrl,
                "",
                `This link is personal to you — please don't share it. It expires on ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You can request a fresh link any time from the careers page.`,
                "",
                `Best regards,`,
                `The ${input.orgName} Talent Team`,
            ].join("\n"),
            type: "other",
            candidateId: input.candidateId,
        });
        if (!result.success) {
            return { success: false, error: result.error ?? "Failed to send email" };
        }
        return { success: true };
    } catch (err) {
        // Never leak the token or the email address in the error.
        console.warn("[portal] Failed to send portal link", (err as Error).message);
        return { success: false, error: "Failed to send portal link" };
    }
}

/**
 * Recruiter-triggered resend: create a fresh token (revoking prior ones)
 * and email the link to the candidate. Returns failure (never throws)
 * when the candidate has no email, is trashed, or belongs to another org.
 */
export async function send_portal_link_for_candidate(
    candidateId: number,
    orgId: string,
): Promise<{ success: boolean; error?: string }> {
    const [candidate] = await db
        .select({
            id: candidates.id,
            name: candidates.name,
            email: candidates.email,
            subdomain: candidates.subdomain,
        })
        .from(candidates)
        .where(
            and(
                eq(candidates.id, candidateId),
                eq(candidates.organization, orgId),
                isNull(candidates.deleted_at),
            ),
        )
        .limit(1);
    if (!candidate) {
        return { success: false, error: "Candidate not found" };
    }
    if (!candidate.email) {
        return { success: false, error: "Candidate has no email address" };
    }

    const org = await get_org_profile(orgId);
    return create_token_and_email_link({
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        orgId,
        orgName: org?.name ?? "Talent Team",
        subdomain: org?.subdomain ?? candidate.subdomain,
        subject: "Track your application",
        intro: "Here is your personal link to track your application status and upcoming interviews.",
    });
}

/**
 * Public "email me my portal link" lookup. ALWAYS returns success:true —
 * never reveals whether the address exists, whether it belongs to this
 * org, or whether it has applications. Sends only when exactly one
 * non-trashed candidate with that email in this org has live applications.
 * Never throws and never logs the email address.
 */
export async function request_portal_link_by_email(
    email: string,
    subdomain: string,
): Promise<{ success: true }> {
    try {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) return { success: true };

        const [org] = await db
            .select({ orgId: organization.clerk_id, orgName: organization.name, subdomain: organization.subdomain })
            .from(organization)
            .where(eq(organization.subdomain, subdomain))
            .limit(1);
        if (!org) return { success: true };

        const matches = await db
            .select({ id: candidates.id, name: candidates.name, email: candidates.email })
            .from(candidates)
            .where(
                and(
                    eq(candidates.email, normalizedEmail),
                    eq(candidates.organization, org.orgId),
                    isNull(candidates.deleted_at),
                ),
            );
        // Ambiguous (shared inbox / duplicate rows) — send nothing.
        if (matches.length !== 1) return { success: true };
        const candidate = matches[0];

        const [liveApp] = await db
            .select({ id: applications.id })
            .from(applications)
            .where(and(eq(applications.candidate, candidate.id), isNull(applications.deleted_at)))
            .limit(1);
        if (!liveApp) return { success: true };

        await create_token_and_email_link({
            candidateId: candidate.id,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            orgId: org.orgId,
            orgName: org.orgName,
            subdomain: org.subdomain,
            subject: "Track your application",
            intro: "Here is your personal link to track your application status and upcoming interviews.",
        });
        return { success: true };
    } catch (err) {
        // Indistinguishable from "no such candidate" — never reveal, never throw.
        console.warn("[portal] Portal link request failed", (err as Error).message);
        return { success: true };
    }
}

// ── Apply-time confirmation ──────────────────────────────────────────────
// WHY THIS PATH (path (b) in the portal contract):
//  - create_application_action does NOT dispatch `candidate_applied`. The
//    public apply form fires fire_public_trigger_action fire-and-forget
//    from the browser after a successful apply; the BullMQ worker then
//    dispatches the Resend ApplicationConfirmationIntegration.
//  - That plugin path is NOT live for confirmations today: the form's
//    trigger context carries only { id, cv_path } for the candidate — no
//    email — so the integration returns { success: false, error: "No
//    candidate email in context" } and sends nothing. It also needs a
//    running worker + Redis and a per-org installed + authenticated
//    Resend plugin. Verified in code (apply-form.tsx, trigger-actions.ts,
//    plugins/providers/resend.ts, worker/index.ts).
//  - So the confirmation is sent here, directly in the apply flow via
//    send_org_email — the always-available path (org key → platform key),
//    with the portal link included. Best-effort: a mail failure must
//    never fail the application.
//  - NO DOUBLE SEND: the plugin path cannot send today (it fails before
//    sending for lack of an email), so exactly one confirmation goes out.
//    If the plugin path is ever fixed to carry the candidate email, the
//    resend-application-confirmation integration must be disabled (or
//    taught to skip when this direct send ran) before that ships —
//    otherwise candidates would get two confirmations.

export async function send_application_confirmation_with_portal_link(input: {
    candidateId: number;
    subdomain: string;
    jobTitle: string;
    applicationId: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const [org] = await db
            .select({ orgId: organization.clerk_id, orgName: organization.name })
            .from(organization)
            .where(eq(organization.subdomain, input.subdomain))
            .limit(1);
        if (!org) return { success: false, error: "Organization not found" };

        const [candidate] = await db
            .select({ id: candidates.id, name: candidates.name, email: candidates.email })
            .from(candidates)
            .where(
                and(
                    eq(candidates.id, input.candidateId),
                    eq(candidates.organization, org.orgId),
                    isNull(candidates.deleted_at),
                ),
            )
            .limit(1);
        if (!candidate || !candidate.email) {
            return { success: false, error: "Candidate not found" };
        }

        const { token, expiresAt } = await create_portal_token(candidate.id);
        const portalUrl = build_portal_url(input.subdomain, token);

        const result = await send_org_email({
            orgId: org.orgId,
            to: candidate.email,
            toName: candidate.name,
            subject: `We received your application for ${input.jobTitle}`,
            text: [
                `Hi ${candidate.name},`,
                "",
                `Thank you for applying for the ${input.jobTitle} role at ${org.orgName}. We've received your application and our team will review it shortly.`,
                "",
                `Your application reference: #${input.applicationId}`,
                "",
                `Track your application — including your current stage and upcoming interviews — here:`,
                portalUrl,
                "",
                `This link is personal to you — please don't share it. It expires on ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You can request a fresh link any time from the careers page.`,
                "",
                `We typically respond within 5–7 business days.`,
                "",
                `Best regards,`,
                `The ${org.orgName} Talent Team`,
            ].join("\n"),
            type: "application_confirmation",
            candidateId: candidate.id,
            templateId: "application_submitted",
        });
        if (!result.success) {
            return { success: false, error: result.error ?? "Failed to send email" };
        }
        return { success: true };
    } catch (err) {
        console.warn("[portal] Failed to send application confirmation", (err as Error).message);
        return { success: false, error: "Failed to send confirmation email" };
    }
}
