import { db } from "@/drizzle/db";
import { departments, job_listings } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { get_organization_by_subdomain_action } from "@/server/actions/organization_actions";
import OpenJobList from "./_components/open-job-list";

const CareerPage = async ({ params }: { params: Promise<{ domain: string }> }) => {
    const { domain } = await params;

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
        createdBy: job_listings.createdBy,
        created_at: job_listings.created_at,
        updated_at: job_listings.updated_at,
        department: departments.name,
    })
        .from(job_listings)
        .where(and(eq(job_listings.subdomain, domain), eq(job_listings.status, 'OPEN')))
        .leftJoin(departments, eq(job_listings.department, departments.id));

    const tenant = await get_organization_by_subdomain_action(domain);

    const defaultTheme = {
        primaryColor: '#4f46e5', // brand-600
        headingText: 'Join our mission to build the future of work.',
        subheadingText: "We're looking for passionate individuals to help us redefine how companies hire and grow.",
        companyName: 'TalentPortal'
    };

    const activeTheme = defaultTheme;

    if (openJobs.length === 0) {
        return (
            <div className="text-center">
                No Open Job Available...
            </div>
        )
    };

    return (
        <main className="max-w-6xl mx-auto px-6 py-12">
            <div>
                <div className="max-w-2xl">
                    <h2 className="text-4xl font-bold text-zinc-900 mb-4">{activeTheme.headingText}</h2>
                    <p className="text-lg text-zinc-500">{activeTheme.subheadingText}</p>
                </div>

                <OpenJobList
                    openJobs={openJobs}
                    activeTheme={activeTheme}
                />
            </div>
        </main>
    );
};

export default CareerPage;
