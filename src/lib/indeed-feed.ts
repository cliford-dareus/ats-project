import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// lib/indeed-feed.ts — the ONE place that knows what Indeed requires.
// The XML route, the job syndication panel, and the Indeed settings page
// all share these helpers so a job is never in the feed in one place and
// unexplainedly missing in another.
//
// Indeed's XML spec (https://docs-plus.indeed.com/job-sync-xml/xml-feed):
//   Required per job: title, date, referencenumber, url, company, city,
//   state, country, description. `<email>` (the client's Indeed account
//   email) is also listed required — we emit it only when the org saved
//   one in the Indeed settings; see the note on buildIndeedFeedXml.
//   `<salary>` and `<jobtype>` are "required if on the career site" —
//   ours shows both, so we emit them whenever the stored values are
//   usable. `<requisitionid>` is listed required; the job id serves as
//   both it and `<referencenumber>`.
//
// REQUIRED vs OPTIONAL — the omission rule (a job missing a REQUIRED
// field is omitted from the feed entirely, never emitted half-filled):
//   Required: title, description, location with at least city + state,
//     job type, a subdomain to build the apply URL from, created_at.
//     The job must also be OPEN and not in Trash (those are feed
//     membership, checked here too so the panel can explain them).
//   Optional (omitted from the <job> node when unknown, never invented):
//     country (third comma part of the location), salary (only when a
//     usable number is stored), postal code / street address (not stored
//     separately — the location string is all we have).
//   Never invented: a missing city/state/country is never defaulted to
//   "US" or any other value. A location of "Remote" alone has no city or
//   state, so that job is omitted with a reason telling the recruiter to
//   put a real "City, ST" in the location.
//
// Location parsing is honest comma-splitting: "Fort Lauderdale, FL" ->
// city "Fort Lauderdale", state "FL", no country. "Austin, TX, US" ->
// country "US". Extra parts beyond the third are ignored; empty parts
// are dropped.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/drizzle/db";
import { job_listings, job_syndication } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { buildCareerApplyUrl } from "@/lib/job-display";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

// The minimum a caller must supply for the omission check / feed build.
// Drizzle's `typeof job_listings.$inferSelect` satisfies this shape.
export type IndeedFeedJobInput = {
    id: number;
    name: string | null;
    description: string | null;
    location: string | null;
    type: "FULL_TIME" | "PART_TIME" | "REMOTE" | "INTERNSHIP" | "CONTRACT" | null;
    salary_from: string | null;
    salary_up_to: string | null;
    subdomain: string | null;
    status: string | null;
    created_at: Date | string | null;
    deleted_at: Date | string | null;
};

export type IndeedLocation = {
    city: string | null;
    state: string | null;
    country: string | null;
};

/** Split a free-text location on commas: city, state, country (all optional). */
export function parseIndeedLocation(location: string | null | undefined): IndeedLocation {
    const parts = (location ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    return {
        city: parts[0] ?? null,
        state: parts[1] ?? null,
        country: parts[2] ?? null,
    };
}

/**
 * Why this job cannot appear in the Indeed feed — empty when it can.
 * Covers feed membership (OPEN, not trashed) and every required field,
 * so the panel and the settings page can show the exact reason instead
 * of a silent omission. Field order is the order the reasons display.
 */
export function getIndeedOmissionReasons(job: IndeedFeedJobInput): string[] {
    const reasons: string[] = [];
    if (job.deleted_at) {
        reasons.push("Job is in Trash");
    }
    if (job.status !== "OPEN") {
        reasons.push(`Job is not open (status: ${job.status ?? "unknown"})`);
    }
    if (!job.name?.trim()) {
        reasons.push("Missing job title");
    }
    if (!job.description?.trim()) {
        reasons.push("Missing job description");
    }
    const { city, state } = parseIndeedLocation(job.location);
    if (!city || !state) {
        reasons.push("Location needs a city and state (e.g. “Fort Lauderdale, FL”)");
    }
    if (!job.type) {
        reasons.push("Missing job type");
    }
    if (!job.subdomain?.trim()) {
        reasons.push("Missing career-page subdomain (no apply URL can be built)");
    }
    if (!job.created_at) {
        reasons.push("Missing publish date");
    }
    return reasons;
}

// ── Salary ──────────────────────────────────────────────────────────────────
// Stored as plain numeric strings; "0" / "" / null mean unset (the career
// page never renders a stored "0" as $0, and neither do we). A stored
// value of 0 or less is not a real salary. No pay period is stored, so
// none is claimed — the range is emitted exactly as stored.
function parseIndeedSalaryValue(value: string | null | undefined): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isNaN(n) || n <= 0 ? null : n;
}

/** "$50,000 - $70,000", "From $50,000", "Up to $70,000", or null. */
export function formatIndeedSalary(
    from: string | null | undefined,
    upTo: string | null | undefined,
): string | null {
    const min = parseIndeedSalaryValue(from);
    const max = parseIndeedSalaryValue(upTo);
    const format = (n: number) => `$${n.toLocaleString()}`;
    if (min !== null && max !== null) return `${format(min)} - ${format(max)}`;
    if (min !== null) return `From ${format(min)}`;
    if (max !== null) return `Up to ${format(max)}`;
    return null;
}

// ── Job type ────────────────────────────────────────────────────────────────
// Indeed jobtype values are fulltime / parttime (etc.). Our REMOTE enum
// value is a work-location style, not an Indeed job type, so it maps to
// no jobtype — instead the <job> node gets <remotetype>Fully remote</
// remotetype>. Never map REMOTE to "fulltime": that would misstate the
// role.
export function mapIndeedJobType(
    type: IndeedFeedJobInput["type"],
): string | null {
    switch (type) {
        case "FULL_TIME":
            return "fulltime";
        case "PART_TIME":
            return "parttime";
        case "CONTRACT":
            return "contract";
        case "INTERNSHIP":
            return "internship";
        case "REMOTE":
        case null:
        default:
            return null;
    }
}

// ── XML ─────────────────────────────────────────────────────────────────────
// Text goes in CDATA (Indeed's own examples do); a literal "]]>" inside
// a value is split so it can never break out of its CDATA section.
const cdata = (value: string): string =>
    `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

const jobXml = (
    job: IndeedFeedJobInput,
    companyName: string,
    indeedAccountEmail: string | null,
): string => {
    const { city, state, country } = parseIndeedLocation(job.location);
    const jobType = mapIndeedJobType(job.type);
    const salary = formatIndeedSalary(job.salary_from, job.salary_up_to);
    const date = job.created_at instanceof Date
        ? job.created_at.toISOString()
        : new Date(job.created_at as string).toISOString();
    // Indeed's own example appends source=Indeed for click tracking;
    // the URL is otherwise the real public apply URL for the job.
    const url = `${buildCareerApplyUrl(job.subdomain!.trim(), job.id)}?source=Indeed`;

    const lines: string[] = [
        `    <title>${cdata(job.name!.trim())}</title>`,
        `    <date>${cdata(date)}</date>`,
        `    <referencenumber>${cdata(String(job.id))}</referencenumber>`,
        `    <requisitionid>${cdata(String(job.id))}</requisitionid>`,
        `    <url>${cdata(url)}</url>`,
        `    <company>${cdata(companyName)}</company>`,
        `    <sourcename>${cdata(companyName)}</sourcename>`,
        `    <city>${cdata(city!)}</city>`,
        `    <state>${cdata(state!)}</state>`,
    ];
    // Country is optional: omitted when the location has no third part.
    // Never defaulted — Indeed lists it required, so a missing country
    // is called out in the settings page; the job is still listed with
    // the city + state it does have.
    if (country) {
        lines.push(`    <country>${cdata(country)}</country>`);
    }
    // The client's Indeed account email, when the org saved one in the
    // Indeed settings. Indeed lists <email> required for verification;
    // without a saved address the element is omitted and the settings
    // page says so, rather than emitting a made-up address.
    if (indeedAccountEmail) {
        lines.push(`    <email>${cdata(indeedAccountEmail)}</email>`);
    }
    lines.push(`    <description>${cdata(job.description!.trim())}</description>`);
    if (salary) {
        lines.push(`    <salary>${cdata(salary)}</salary>`);
    }
    if (jobType) {
        lines.push(`    <jobtype>${cdata(jobType)}</jobtype>`);
    }
    if (job.type === "REMOTE") {
        lines.push(`    <remotetype>${cdata("Fully remote")}</remotetype>`);
    }
    return `  <job>\n${lines.join("\n")}\n  </job>`;
};

export function buildIndeedFeedXml(input: {
    companyName: string;
    jobs: IndeedFeedJobInput[];
    indeedAccountEmail?: string | null;
}): string {
    // Caller guarantees every job passed getIndeedOmissionReasons() with
    // an empty result; the filter below is a belt-and-braces guard so a
    // bad job can never half-render into the feed.
    const included = input.jobs.filter((job) => getIndeedOmissionReasons(job).length === 0);
    const publisherUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        `https://app.${ROOT_DOMAIN}`;
    const jobNodes = included
        .map((job) => jobXml(job, input.companyName, input.indeedAccountEmail ?? null))
        .join("\n");
    return (
        `<?xml version="1.0" encoding="utf-8"?>\n` +
        `<source>\n` +
        `  <publisher>${cdata("Aplico")}</publisher>\n` +
        `  <publisherurl>${cdata(publisherUrl)}</publisherurl>\n` +
        (jobNodes ? `${jobNodes}\n` : "") +
        `</source>`
    );
}

// ── Feed membership query ───────────────────────────────────────────────────
// Jobs the feed draws from: OPEN + not trashed + the recruiter marked them
// syndicated for Indeed. (A job that is OPEN but never published to
// Indeed is intentionally NOT in the feed — the row is the opt-in.
// Note this differs from Indeed's "include every job from your career
// page" guidance; see the route handler's comment.)
export async function getIndeedFeedCandidateJobs(
    subdomain: string,
): Promise<(typeof job_listings.$inferSelect)[]> {
    const rows = await db
        .select({ job: job_listings })
        .from(job_listings)
        .innerJoin(
            job_syndication,
            and(
                eq(job_syndication.job_id, job_listings.id),
                eq(job_syndication.board_id, "indeed"),
                eq(job_syndication.status, "syndicated"),
            ),
        )
        .where(and(
            eq(job_listings.subdomain, subdomain),
            eq(job_listings.status, "OPEN"),
            isNull(job_listings.deleted_at),
        ));
    return rows.map((r) => r.job);
}
