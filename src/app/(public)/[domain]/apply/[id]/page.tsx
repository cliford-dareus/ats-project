import ApplyForm from '../../_components/apply-form';

type ApplyPageProps = {
    params: Promise<{ id: string, domain: string }>;
};

const ApplyPage = async ({ params }: ApplyPageProps) => {
    const { id, domain } = await params
        
    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
            <main className="pb-20">
                <ApplyForm jobId={Number(id)} subdomain={domain} />
            </main>
        </div>
    );
};

export default ApplyPage;
