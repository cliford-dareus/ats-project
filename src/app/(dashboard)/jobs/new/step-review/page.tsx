import StepReviewForm from "@/app/(dashboard)/jobs/new/_component/forms/step-review-form";
import { HasPermission } from "@/components/has-permission";
import { get_job_draft_action } from "@/server/actions/job-listings-actions";
import type { WizardDraftData } from "@/providers/new-job-provider";

type Props = {
    searchParams: Promise<{ draft?: string | string[] }>;
};

const Page = async ({ searchParams }: Props) => {
    const draftParam = (await searchParams)?.draft;
    const draftId = typeof draftParam === "string" ? Number(draftParam) : NaN;

    // Same resume path as the other steps: a fresh browser deep-linking
    // here with ?draft=<id> hydrates the review from the DRAFT row.
    let initialDraft: WizardDraftData | null = null;
    if (!Number.isNaN(draftId)) {
        try {
            const result = await get_job_draft_action(draftId);
            if (result && !("error" in result)) {
                initialDraft = result;
            }
        } catch {
            initialDraft = null;
        }
    }

    return(
        <HasPermission permission="job:create" renderFallback fallbackText="You need permission to create job listings to use the job wizard.">
            <div className="py-8">
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">Review & Publish</h1>
                    <p className="text-muted-foreground">Review your job listing before publishing</p>
                </div>
                <StepReviewForm initialDraft={initialDraft} />
            </div>
        </HasPermission>
    )
};

export default Page;
