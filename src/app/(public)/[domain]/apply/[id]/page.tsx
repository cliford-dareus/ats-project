import Link from "next/link";
import ApplyForm from '../../_components/apply-form';
import { get_organization_by_subdomain_action } from "@/server/actions/organization_actions";
import { get_public_job_for_apply } from "@/server/queries/drizzle/application";
import { get_public_screening_questions_action } from "@/server/actions/screening-actions";
import { resolveCompanyName } from "@/lib/org-branding";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ApplyPageProps = {
    params: Promise<{ id: string, domain: string }>;
};

const ApplyPage = async ({ params }: ApplyPageProps) => {
    const { id, domain } = await params

    const [tenant] = await get_organization_by_subdomain_action(domain);
    const companyName = resolveCompanyName(tenant?.name, domain);

    // Validate the job before rendering the form: an invalid id, or a job
    // that is closed/archived/draft/pending, must not present an apply form
    // that can only fail at submit.
    const jobId = Number(id);
    const job = Number.isFinite(jobId) ? await get_public_job_for_apply(jobId, domain) : null;

    if (!job) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
                <main className="pb-20">
                    <div className="max-w-2xl mx-auto px-4 py-20">
                        <Card className="p-12 text-center">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Job not found</h1>
                            <p className="text-zinc-500 mb-8">
                                This job posting doesn&apos;t exist or has been removed.
                            </p>
                            <Button asChild size="lg">
                                <Link href={`/${domain}`}>Back to Careers</Link>
                            </Button>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    if (job.status !== "OPEN") {
        return (
            <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
                <main className="pb-20">
                    <div className="max-w-2xl mx-auto px-4 py-20">
                        <Card className="p-12 text-center">
                            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Applications are closed</h1>
                            <p className="text-zinc-500 mb-8">
                                {job.name} at {companyName} is no longer accepting applications.
                            </p>
                            <Button asChild size="lg">
                                <Link href={`/${domain}`}>View Open Roles</Link>
                            </Button>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    // Public screening questions for this job, loaded server-side so the
    // form receives them as props. Array on success; on failure (job not
    // OPEN / missing — already guarded above) the form falls back to no
    // questions and the server still validates answers at submit.
    const questionsResult = await get_public_screening_questions_action(jobId);
    const screeningQuestions = Array.isArray(questionsResult) ? questionsResult : [];

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white">
            <main className="pb-20">
                <ApplyForm jobId={Number(id)} subdomain={domain} companyName={companyName} screeningQuestions={screeningQuestions} />
            </main>
        </div>
    );
};

export default ApplyPage;
