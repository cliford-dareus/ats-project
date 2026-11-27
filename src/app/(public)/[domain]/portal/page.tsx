import RequestPortalLinkForm from "./_components/request-portal-link-form";
import { get_organization_by_subdomain_action } from "@/server/actions/organization_actions";
import { resolveCompanyName } from "@/lib/org-branding";

// Public request-link page: https://{subdomain}.{root}/portal
// No auth — the token emailed to the candidate is the only credential, and
// this page only asks for the address to send one to.
const PortalRequestPage = async ({ params }: { params: Promise<{ domain: string }> }) => {
    const { domain } = await params;

    const [tenant] = await get_organization_by_subdomain_action(domain);
    const companyName = resolveCompanyName(tenant?.name, domain);

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
            <main className="pb-20">
                <div className="max-w-2xl mx-auto px-4 py-20">
                    <RequestPortalLinkForm subdomain={domain} companyName={companyName} />
                </div>
            </main>
        </div>
    );
};

export default PortalRequestPage;
