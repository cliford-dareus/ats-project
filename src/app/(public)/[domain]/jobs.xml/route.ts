// GET /jobs.xml — the org's public Indeed XML feed.
//
// ROUTE CHOICE: this lives under src/app/(public)/[domain]/jobs.xml so it
// resolves through the existing career-host rewrite in src/middleware.ts:
// a request to <subdomain>.aplico.online/jobs.xml is rewritten to
// /<subdomain>/jobs.xml, and [domain] IS the subdomain — the same
// mechanism the career page itself uses. No /api route was needed, and
// no org id is ever accepted from the request: the org is resolved from
// the subdomain alone, and only that org's jobs are ever served.
//
// INCLUSION: OPEN + not trashed + the recruiter published the job to
// Indeed (job_syndication row, board 'indeed', status 'syndicated') +
// the job passes the required-field check in src/lib/indeed-feed.ts.
// Jobs failing the check are omitted, never half-emitted.
//
// NOTE — partial feeds: Indeed's own guide says to "include every job
// from your career page" and warns partial feeds may be rejected or lose
// visibility. This feed deliberately includes only jobs the recruiter
// opted in to Indeed, per the product decision for this feature. If
// Indeed rejects a feed for incompleteness, the fix is to change the
// inclusion rule here (and in get_indeed_feed_status_action) to all OPEN
// jobs — a one-line decision, not a redesign.
//
// No auth: this is a public feed Indeed polls. Tenant isolation comes
// from the subdomain lookup, not from a session — a request for an
// unknown subdomain gets a 404 and no other org's jobs can leak through
// it, because the jobs query filters on the resolved subdomain.
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { organization } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { db_get_organization_plugins_raw } from "@/server/queries/drizzle/plugin-queries";
import {
    buildIndeedFeedXml,
    getIndeedFeedCandidateJobs,
    getIndeedOmissionReasons,
} from "@/lib/indeed-feed";
import { resolveCompanyName } from "@/lib/org-branding";

// The feed must reflect the current DB on every poll — never a stale
// statically rendered copy.
export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ domain: string }> },
) {
    const { domain } = await params;

    // Resolve the org from the subdomain ONLY. (The
    // get_organization_by_subdomain action is not used here: its
    // projection has no clerk_id, which is needed below to read the
    // org's Indeed account email from its plugin settings.)
    const [org] = await db
        .select({ clerk_id: organization.clerk_id, name: organization.name })
        .from(organization)
        .where(eq(organization.subdomain, domain))
        .limit(1);
    if (!org) {
        return new NextResponse("Organization not found", { status: 404 });
    }

    const companyName = resolveCompanyName(org.name, domain);

    const candidates = await getIndeedFeedCandidateJobs(domain);
    const jobs = candidates.filter((job) => getIndeedOmissionReasons(job).length === 0);

    // The client's Indeed account email, when the org saved one in the
    // Indeed settings (plain config value, not a credential). Indeed
    // lists <email> required for verification; without it the element is
    // omitted — see buildIndeedFeedXml.
    const record = await db_get_organization_plugins_raw(org.clerk_id);
    const storedEmail = record.settings?.indeed?.config?.indeedAccountEmail;
    const indeedAccountEmail =
        typeof storedEmail === "string" && storedEmail.trim() !== ""
            ? storedEmail.trim()
            : null;

    const xml = buildIndeedFeedXml({ companyName, jobs, indeedAccountEmail });

    return new NextResponse(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Indeed polls on its own schedule; a short public cache
            // keeps repeated polls cheap without going stale.
            "Cache-Control": "public, max-age=300",
        },
    });
}
