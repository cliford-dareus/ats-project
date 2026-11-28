import { db } from "@/drizzle/db";
import { departments, job_listings } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { get_organization_by_subdomain_action } from "@/server/actions/organization_actions";
import {
    resolveCompanyName,
    resolveFontFamily,
    resolveLogoUrl,
    resolvePrimaryColor,
    resolveTagline,
} from "@/lib/org-branding";
import OpenJobList from "./_components/open-job-list";

const CareerPage = async ({ params }: { params: Promise<{ domain: string }> }) => {
    const { domain } = await params;

    const [tenant] = await get_organization_by_subdomain_action(domain);
    if (!tenant) {
        return <div>Tenant not found</div>;
    }

    // Branding comes from the org resolved from this page's own subdomain.
    // The tagline (when set) renders as the hero lede, and the logo renders
    // above the name; with neither set the layout stays name-only — no copy
    // is invented. resolvePrimaryColor always returns a hex color, so the
    // tint below is built by appending a hex alpha channel.
    const companyName = resolveCompanyName(tenant.name, domain);
    const tagline = resolveTagline(tenant.tagline);
    const logoUrl = resolveLogoUrl(domain, tenant.logo_url);
    const primaryColor = resolvePrimaryColor(tenant.primary_color);
    const initial = companyName.charAt(0).toUpperCase();

    const openJobs = await db.select({
        id: job_listings.id,
        name: job_listings.name,
        location: job_listings.location,
        description: job_listings.description,
        salary_up_to: job_listings.salary_up_to,
        salary_from: job_listings.salary_from,
        type: job_listings.type,
        subdomain: job_listings.subdomain,
        organization: job_listings.organization,
        status: job_listings.status,
        created_by: job_listings.created_by,
        created_at: job_listings.created_at,
        updated_at: job_listings.updated_at,
        department: departments.name,
    })
        .from(job_listings)
        .where(and(eq(job_listings.subdomain, domain), eq(job_listings.status, 'OPEN'), isNull(job_listings.deleted_at)))
        .leftJoin(departments, eq(job_listings.department, departments.id));

    // Both stats come from the OPEN rows loaded above — nothing else is
    // counted, and no other numbers appear on the page.
    const openRoleCount = openJobs.length;
    const departmentCount = new Set(
        openJobs.map((job) => job.department).filter((d): d is string => d !== null)
    ).size;

    return (
        <main style={{ fontFamily: resolveFontFamily(tenant.font_family) }}>
            {/* ── Hero: brand-led, full-width ─────────────────────────────── */}
            <section
                className="relative overflow-hidden border-b border-zinc-100"
                style={{ backgroundColor: `${primaryColor}0f` }}
            >
                {/* Soft brand glow, decorative only */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-10 blur-3xl"
                    style={{ backgroundColor: primaryColor }}
                />
                <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={companyName}
                            className="h-20 w-auto max-w-56 object-contain mb-7"
                        />
                    ) : (
                        <div
                            className="h-20 w-20 rounded-3xl flex items-center justify-center mb-7"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <span className="text-white font-black text-4xl italic tracking-tighter">{initial}</span>
                        </div>
                    )}
                    <p
                        className="text-xs font-bold uppercase tracking-[0.25em] mb-4"
                        style={{ color: primaryColor }}
                    >
                        Careers
                    </p>
                    <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 mb-5">
                        {companyName}
                    </h1>
                    {tagline && (
                        <p className="text-xl text-zinc-600 max-w-2xl leading-relaxed mb-8">{tagline}</p>
                    )}
                    <a
                        href="#open-positions"
                        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                    >
                        View {openRoleCount} open {openRoleCount === 1 ? "role" : "roles"}
                    </a>
                </div>
            </section>

            {/* ── Stats strip: real counts only ───────────────────────────── */}
            <section className="border-b border-zinc-100 bg-white">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 divide-x divide-zinc-100">
                    <div className="py-6 pr-4">
                        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">{openRoleCount}</p>
                        <p className="text-sm text-zinc-500 mt-1">Open {openRoleCount === 1 ? "role" : "roles"}</p>
                    </div>
                    <div className="py-6 pl-6 sm:pl-10">
                        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">{departmentCount}</p>
                        <p className="text-sm text-zinc-500 mt-1">{departmentCount === 1 ? "Department" : "Departments"} hiring</p>
                    </div>
                </div>
            </section>

            {/* ── Jobs by department ──────────────────────────────────────── */}
            <section id="open-positions" className="max-w-6xl mx-auto px-6 py-12 sm:py-16 scroll-mt-20">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Open roles</h2>
                    <p className="text-zinc-500 mt-2">
                        {openRoleCount === 0
                            ? `No open roles at ${companyName} right now — check back soon.`
                            : `${openRoleCount} open ${openRoleCount === 1 ? "role" : "roles"} across ${departmentCount} ${departmentCount === 1 ? "department" : "departments"}.`}
                    </p>
                </div>

                {openRoleCount === 0 ? (
                    <div className="py-16 text-center rounded-3xl border border-dashed border-zinc-200">
                        <p className="text-lg font-semibold text-zinc-900">No open roles right now</p>
                        <p className="text-zinc-500 mt-2">Check back soon — new roles are posted here first.</p>
                    </div>
                ) : (
                    <OpenJobList
                        openJobs={openJobs}
                        activeTheme={{ primaryColor }}
                    />
                )}
            </section>
        </main>
    );
};

export default CareerPage;
