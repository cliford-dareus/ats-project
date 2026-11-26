import ApplyForm from '../../_components/apply-form';
import { get_organization_by_subdomain_action } from "@/server/actions/organization_actions";
import { resolveCompanyName } from "@/lib/org-branding";

type ApplyPageProps = {
    params: Promise<{ id: string, domain: string }>;
};

const ApplyPage = async ({ params }: ApplyPageProps) => {
    const { id, domain } = await params

    const [tenant] = await get_organization_by_subdomain_action(domain);
    const companyName = resolveCompanyName(tenant?.name, domain);

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
            <main className="pb-20">
                <ApplyForm jobId={Number(id)} subdomain={domain} companyName={companyName} />
            </main>
        </div>
    );
};

export default ApplyPage;
