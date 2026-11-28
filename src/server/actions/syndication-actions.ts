"use server";

// ─────────────────────────────────────────────────────────────────────────────
// server/actions/syndication-actions.ts — job-board syndication.
//
// Tenant rule, as everywhere: the org ALWAYS comes from the Clerk
// session (getAuthOrThrow / requirePermission) and the job is proven to
// belong to it (assertJobBelongsToOrg, 404-style). No client-supplied
// orgId is ever trusted. Board config reads are plugin:manage; per-job
// publish/unpublish/mark-posted are job:edit; reads are job:view.
//
// Indeed is feed-based: "publish" only records the recruiter's intent
// (a `job_syndication` row, status 'syndicated'); the public XML feed
// then includes the job automatically. There is no push to Indeed and
// no Indeed credential anywhere in this flow.
//
// LinkedIn is MANUAL: this action never sets a LinkedIn row to
// 'syndicated' and never claims a post happened. A recruiter copies the
// posting draft, posts it themselves, and marks it posted with the real
// post URL — only then does the row become 'posted'.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { job_listings, job_syndication, organization } from "@/drizzle/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getOrgPluginFlags } from "@/server/actions/plugin-actions";
import { assertJobBelongsToOrg, getAuthOrThrow, requirePermission } from "@/server/permissions";
import { record_activity } from "@/server/activity/record-activity";
import { db_get_organization_plugins_raw } from "@/server/queries/drizzle/plugin-queries";
import {
    getIndeedFeedCandidateJobs,
    getIndeedOmissionReasons,
    type IndeedFeedJobInput,
} from "@/lib/indeed-feed";
import { buildCareerApplyUrl, formatJobTypeLabel } from "@/lib/job-display";
import { formatSalaryRange } from "@/lib/format-salary-range";
import { resolveCompanyName } from "@/lib/org-branding";
import type {
    SyndicationBoardId,
    SyndicationBoardState,
    SyndicationBoardStatus,
} from "@/types";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

const SYNDICATION_BOARDS: SyndicationBoardId[] = ["indeed", "linkedin"];

const BOARD_NAMES: Record<SyndicationBoardId, string> = {
    indeed: "Indeed",
    linkedin: "LinkedIn",
};

type SyndicationRow = typeof job_syndication.$inferSelect;

const toBoardState = (
    boardId: SyndicationBoardId,
    enabled: boolean,
    row: SyndicationRow | undefined,
): SyndicationBoardState => ({
    boardId,
    enabled,
    status: (row?.status ?? "not_syndicated") as SyndicationBoardStatus,
    externalUrl: row?.external_url ?? null,
    errorMessage: row?.error_message ?? null,
    updatedAt: row?.updated_at ? row.updated_at.toISOString() : null,
});

const loadSyndicationRows = async (jobId: number): Promise<SyndicationRow[]> =>
    db.select().from(job_syndication).where(eq(job_syndication.job_id, jobId));

const loadJobRow = async (jobId: number, orgId: string) => {
    const [job] = await db
        .select()
        .from(job_listings)
        .where(and(eq(job_listings.id, jobId), eq(job_listings.organization, orgId)))
        .limit(1);
    return job;
};

/** Upsert one (job, board) row — the unique index on (job_id, board_id) makes this safe. */
const upsertBoardRow = async (
    jobId: number,
    boardId: SyndicationBoardId,
    patch: { status: SyndicationBoardStatus; externalUrl?: string | null; errorMessage?: string | null },
) => {
    await db
        .insert(job_syndication)
        .values({
            job_id: jobId,
            board_id: boardId,
            status: patch.status,
            external_url: patch.externalUrl ?? null,
            error_message: patch.errorMessage ?? null,
        })
        .onDuplicateKeyUpdate({
            set: {
                status: patch.status,
                external_url: patch.externalUrl ?? null,
                error_message: patch.errorMessage ?? null,
            },
        });
};

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Both boards' state for one job, plus the Indeed omission reasons for
 * that job (empty when the job would appear in the feed). `enabled`
 * comes from the org's plugin flags — a board whose plugin is not
 * installed + enabled can never be published from the UI.
 * Throws 404-style when the job is not this org's (or is trashed).
 */
export async function get_job_syndication_action(jobId: number): Promise<{
    success: true;
    boards: SyndicationBoardState[];
    indeedOmissionReasons: string[];
}> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("job:view");
    await assertJobBelongsToOrg(jobId, orgId);

    const flags = await getOrgPluginFlags();
    const rows = await loadSyndicationRows(jobId);
    const job = await loadJobRow(jobId, orgId);

    return {
        success: true,
        boards: SYNDICATION_BOARDS.map((boardId) =>
            toBoardState(boardId, flags[boardId] === true, rows.find((r) => r.board_id === boardId)),
        ),
        // The job row is guaranteed present (the assert above found it).
        indeedOmissionReasons: job ? getIndeedOmissionReasons(job) : ["Job not found"],
    };
}

// ── Publish / unpublish ─────────────────────────────────────────────────────

export async function set_job_syndication_action(
    jobId: number,
    boardId: SyndicationBoardId,
    action: "publish" | "unpublish",
): Promise<{ success: boolean; message?: string; board?: SyndicationBoardState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("job:edit");
    const job = await assertJobBelongsToOrg(jobId, orgId);

    if (!SYNDICATION_BOARDS.includes(boardId)) {
        return { success: false, message: `Unknown board "${boardId}"` };
    }

    const flags = await getOrgPluginFlags();
    if (flags[boardId] !== true) {
        return {
            success: false,
            message: `${BOARD_NAMES[boardId]} is not enabled for this organization. Enable it in Settings → Plugins first.`,
        };
    }

    // LinkedIn has no API post: publishing here would claim a post that
    // never happened. The only LinkedIn write path is
    // mark_linkedin_posted_action, with a real post URL.
    if (boardId === "linkedin") {
        return {
            success: false,
            message: "LinkedIn posting is manual — copy the posting draft and mark it posted once live.",
        };
    }

    // Indeed publish requires an OPEN, non-trashed job. (Trashed already
    // 404'd in assertJobBelongsToOrg — no action can target a trashed
    // job, here or elsewhere.)
    const jobRow = await loadJobRow(jobId, orgId);
    if (!jobRow) {
        return { success: false, message: "Job not found" };
    }
    if (action === "publish" && jobRow.status !== "OPEN") {
        return {
            success: false,
            message: `Only an open job can be published to Indeed (this job is ${jobRow.status ?? "unknown"}).`,
        };
    }

    const status: SyndicationBoardStatus =
        action === "publish" ? "syndicated" : "not_syndicated";
    await upsertBoardRow(jobId, "indeed", { status });

    // Activity log, entity type 'plugin' (migration 0013). entity_id is
    // the job id — the log column takes a plain number and has no FK, so
    // the job id is the useful link; the summary names the board + job.
    await record_activity({
        action: action === "publish" ? "job.syndicated.indeed" : "job.unsyndicated.indeed",
        entity_type: "plugin",
        entity_id: jobId,
        summary:
            action === "publish"
                ? `Published "${job.name}" to Indeed`
                : `Removed "${job.name}" from Indeed`,
    });

    const [row] = await loadSyndicationRows(jobId).then((rows) =>
        rows.filter((r) => r.board_id === "indeed"),
    );

    // Publishing records intent even when the job is missing a required
    // feed field — the feed still omits it, and the panel shows why.
    // Refusing the publish would hide the intent; warn instead.
    let message: string | undefined;
    if (action === "publish") {
        const reasons = getIndeedOmissionReasons(jobRow);
        message =
            reasons.length > 0
                ? `Published to Indeed, but this job won't appear in the feed yet: ${reasons.join("; ")}.`
                : "Published to Indeed — the job is now in your XML feed.";
    }

    return {
        success: true,
        message,
        board: toBoardState("indeed", true, row),
    };
}

// ── LinkedIn: mark posted / posting draft ───────────────────────────────────

const isLinkedInPostUrl = (value: string): boolean => {
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "https:") return false;
        const host = url.hostname.toLowerCase();
        return host === "linkedin.com" || host.endsWith(".linkedin.com");
    } catch {
        return false;
    }
};

/**
 * Record a MANUAL LinkedIn post: validates the URL is really a
 * linkedin.com URL, then sets status 'posted' + externalUrl. This is
 * the only path that ever writes 'posted' — nothing here posts for you.
 */
export async function mark_linkedin_posted_action(
    jobId: number,
    postUrl: string,
): Promise<{ success: boolean; message?: string; board?: SyndicationBoardState }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("job:edit");
    const job = await assertJobBelongsToOrg(jobId, orgId);

    const flags = await getOrgPluginFlags();
    if (flags["linkedin"] !== true) {
        return {
            success: false,
            message: "LinkedIn is not enabled for this organization. Enable it in Settings → Plugins first.",
        };
    }

    const url = postUrl?.trim() ?? "";
    if (!url || !isLinkedInPostUrl(url)) {
        return {
            success: false,
            message: "Enter the real LinkedIn post URL (https://www.linkedin.com/…).",
        };
    }

    await upsertBoardRow(jobId, "linkedin", { status: "posted", externalUrl: url });

    await record_activity({
        action: "job.posted.linkedin",
        entity_type: "plugin",
        entity_id: jobId,
        summary: `Marked "${job.name}" as posted on LinkedIn`,
    });

    const [row] = await loadSyndicationRows(jobId).then((rows) =>
        rows.filter((r) => r.board_id === "linkedin"),
    );
    return {
        success: true,
        message: "Marked as posted on LinkedIn.",
        board: toBoardState("linkedin", true, row),
    };
}

/**
 * Plain-text LinkedIn posting draft built ONLY from real job fields —
 * title, company, location, type, salary when stored, a description
 * excerpt, and the real apply URL. No invented copy, no slogans, no
 * made-up perks. The recruiter copies it, posts it themselves, and
 * marks it posted with the URL.
 */
export async function get_linkedin_posting_draft_action(
    jobId: number,
): Promise<{ success: boolean; draft?: string; message?: string }> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("job:view");
    await assertJobBelongsToOrg(jobId, orgId);

    const jobRow = await loadJobRow(jobId, orgId);
    if (!jobRow) {
        return { success: false, message: "Job not found" };
    }
    const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.clerk_id, orgId))
        .limit(1);
    const companyName = resolveCompanyName(org?.name, jobRow.subdomain);

    const lines: string[] = [jobRow.name, companyName];
    if (jobRow.location?.trim()) {
        lines.push(jobRow.location.trim());
    }
    const typeLabel = formatJobTypeLabel(jobRow.type);
    if (typeLabel !== "—") {
        lines.push(typeLabel);
    }
    const salary = formatSalaryRange(jobRow.salary_from, jobRow.salary_up_to);
    if (salary) {
        lines.push(salary);
    }
    lines.push("");
    // Description excerpt: the first 500 characters, cut at a word
    // boundary — never the whole description when it is long, never
    // invented text when it is short.
    const description = jobRow.description?.trim() ?? "";
    if (description) {
        const excerpt =
            description.length > 500
                ? `${description.slice(0, 500).replace(/\s+\S*$/, "")}…`
                : description;
        lines.push(excerpt);
        lines.push("");
    }
    lines.push(`Apply: ${buildCareerApplyUrl(jobRow.subdomain, jobRow.id)}`);

    return { success: true, draft: lines.join("\n") };
}

// ── Indeed feed status (settings page) ──────────────────────────────────────

export type IndeedFeedStatusJob = {
    id: number;
    title: string;
    reasons?: string[];
};

/**
 * What the Indeed settings page shows: the public feed URL, how many
 * OPEN jobs are actually in the feed, which syndicated jobs are omitted
 * and why, and how many OPEN jobs were never published to Indeed.
 * Admin-only (plugin:manage), like the rest of the settings page.
 */
export async function get_indeed_feed_status_action(): Promise<
    | {
          success: true;
          feedUrl: string;
          companyName: string;
          inFeedCount: number;
          inFeedJobs: IndeedFeedStatusJob[];
          omittedJobs: IndeedFeedStatusJob[];
          notPublishedCount: number;
          indeedAccountEmail: string | null;
      }
    | { success: false; message: string }
> {
    const { orgId } = await getAuthOrThrow();
    await requirePermission("plugin:manage");

    const [org] = await db
        .select({ name: organization.name, subdomain: organization.subdomain })
        .from(organization)
        .where(eq(organization.clerk_id, orgId))
        .limit(1);
    if (!org?.subdomain) {
        return { success: false, message: "Organization subdomain not found" };
    }

    const feedUrl = `https://${org.subdomain}.${ROOT_DOMAIN}/jobs.xml`;
    const companyName = resolveCompanyName(org.name, org.subdomain);

    // Every OPEN, non-trashed job for this org, classified by the same
    // required-field check the feed itself uses.
    const openJobs = await db
        .select()
        .from(job_listings)
        .where(and(
            eq(job_listings.subdomain, org.subdomain),
            eq(job_listings.status, "OPEN"),
            isNull(job_listings.deleted_at),
        ));
    const indeedRows = openJobs.length > 0
        ? await db
            .select()
            .from(job_syndication)
            .where(and(
                inArray(job_syndication.job_id, openJobs.map((j) => j.id)),
                eq(job_syndication.board_id, "indeed"),
            ))
        : [];
    const syndicatedIds = new Set(
        indeedRows.filter((r) => r.status === "syndicated").map((r) => r.job_id),
    );

    const inFeedJobs: IndeedFeedStatusJob[] = [];
    const omittedJobs: IndeedFeedStatusJob[] = [];
    let notPublishedCount = 0;
    for (const job of openJobs) {
        if (!syndicatedIds.has(job.id)) {
            notPublishedCount += 1;
            continue;
        }
        const reasons = getIndeedOmissionReasons(job as IndeedFeedJobInput);
        if (reasons.length === 0) {
            inFeedJobs.push({ id: job.id, title: job.name });
        } else {
            omittedJobs.push({ id: job.id, title: job.name, reasons });
        }
    }

    // Sanity: the route's own candidate query must agree with this
    // classification (same check, same rows). A mismatch here means the
    // two code paths drifted — log it, don't fail the page.
    const feedCandidates = await getIndeedFeedCandidateJobs(org.subdomain);
    if (feedCandidates.length !== inFeedJobs.length) {
        console.warn(
            `[syndication] Feed count mismatch for ${org.subdomain}: ` +
            `route candidates=${feedCandidates.length}, settings in-feed=${inFeedJobs.length}`,
        );
    }

    // The Indeed account email is a plain config value (not a
    // credential): it is stored unencrypted in the plugin settings and
    // read raw here so the settings page can show it back.
    const record = await db_get_organization_plugins_raw(orgId);
    const storedEmail = record.settings?.indeed?.config?.indeedAccountEmail;
    const indeedAccountEmail =
        typeof storedEmail === "string" && storedEmail.trim() !== ""
            ? storedEmail.trim()
            : null;

    return {
        success: true,
        feedUrl,
        companyName,
        inFeedCount: inFeedJobs.length,
        inFeedJobs,
        omittedJobs,
        notPublishedCount,
        indeedAccountEmail,
    };
}
