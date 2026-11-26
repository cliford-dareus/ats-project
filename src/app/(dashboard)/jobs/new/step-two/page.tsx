import StepTwoForm from "../_component/forms/step-two-form";
import { HasPermission } from "@/components/has-permission";
import { get_job_draft_action } from "@/server/actions/job-listings-actions";
import type { WizardDraftData } from "@/providers/new-job-provider";

type Props = {
    searchParams: Promise<{ draft?: string | string[] }>;
};

export default async function Page({ searchParams }: Props) {
    const draftParam = (await searchParams)?.draft;
    const draftId = typeof draftParam === "string" ? Number(draftParam) : NaN;

    // Same resume path as step one: a fresh browser deep-linking here with
    // ?draft=<id> hydrates the form from the DRAFT row instead of showing
    // a blank step. A missing/foreign/published draft just keeps the
    // browser's own in-progress state.
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

    return (
        <HasPermission permission="job:create" renderFallback fallbackText="You need permission to create job listings to use the job wizard.">
            <div className="py-8">
                {/* Header */}
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">Requirements</h1>
                    <p className="text-muted-foreground">Define the skills and experience needed for this role</p>
                </div>
                <StepTwoForm draftId={Number.isNaN(draftId) ? null : draftId} initialDraft={initialDraft}/>
            </div>  
        </HasPermission>
    );
};
