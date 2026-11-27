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
    // The tagline (when set) renders as a subheading under the heading,
    // and the logo renders above it; with neither set the layout stays
    // heading-only — no copy is invented.
    const companyName = resolveCompanyName(tenant.name, domain);
    const tagline = resolveTagline(tenant.tagline);
    const logoUrl = resolveLogoUrl(domain, tenant.logo_url);
    const activeTheme = {
        primaryColor: resolvePrimaryColor(tenant.primary_color),
    };

    const openJobs = await db.select({
        id: job_listings.id,
        name: job_listings.name,
        location: job_listings.location,
        description: job_listings.description,
        salary_up_to: job_listings.salary_up_to,
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

    return (
        <main
            id="open-positions"
            className="max-w-6xl mx-auto px-6 py-12"
            style={{ fontFamily: resolveFontFamily(tenant.font_family) }}
        >
            <div>
                <div className="max-w-2xl">
                    {logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={companyName}
                            className="h-16 w-auto max-w-48 object-contain mb-4"
                        />
                    )}
                    <h2 className="text-4xl font-bold text-zinc-900 mb-4">Open roles at {companyName}</h2>
                    {tagline && (
                        <p className="text-lg text-zinc-500 mb-4">{tagline}</p>
                    )}
                </div>

                {openJobs?.length === 0 ? (
                    <p className="text-lg text-zinc-500">
                        No open roles at {companyName} right now — check back soon.
                    </p>
                ) : (
                    <OpenJobList
                        openJobs={openJobs}
                        activeTheme={activeTheme}
                    />
                )}
            </div>
        </main>
    );
};

export default CareerPage;
