import StepThreeForm from "@/app/(dashboard)/jobs/new/_component/forms/step-three-form";
import { HasPermission } from "@/components/has-permission";
import { get_users } from "./_actions";
import { get_job_draft_action } from "@/server/actions/job-listings-actions";
import type { WizardDraftData } from "@/providers/new-job-provider";

type Props = {
    searchParams: Promise<{ draft?: string | string[] }>;
};

export default async function Page({ searchParams }: Props) {
    const users = await get_users();
    const draftParam = (await searchParams)?.draft;
    const draftId = typeof draftParam === "string" ? Number(draftParam) : NaN;

    // Same resume path as step one: a fresh browser deep-linking here with
    // ?draft=<id> hydrates the form from the DRAFT row instead of showing
    // a blank step.
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
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">Hiring Workflow</h1>
                    <p className="text-muted-foreground">Design your hiring pipeline and interview process</p>
                </div>
                <StepThreeForm users={users} draftId={Number.isNaN(draftId) ? null : draftId} initialDraft={initialDraft}/>
            </div>
        </HasPermission>
    );
};
