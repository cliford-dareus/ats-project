import StepOneForm from "../_component/forms/step-one-form";
import {get_dept} from "@/app/(dashboard)/jobs/new/step-one/_actions";
import { HasPermission } from "@/components/has-permission";
import { get_job_draft_action } from "@/server/actions/job-listings-actions";
import type { WizardDraftData } from "@/providers/new-job-provider";

type Props = {
    searchParams: Promise<{ draft?: string | string[] }>;
};

export default async function Page({ searchParams }: Props) {
    const departments = await get_dept();

    // Resume a draft: ?draft=<id> loads the DRAFT row (org-scoped,
    // job:create-gated) so the wizard opens pre-filled. A missing, foreign,
    // or already-published draft just starts a fresh wizard.
    let initialDraft: WizardDraftData | null = null;
    const draftParam = (await searchParams)?.draft;
    const draftId = typeof draftParam === "string" ? Number(draftParam) : NaN;
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
            <div className="py-8 w-full h-full">
                {/* Header */}
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">
                        Job Details
                    </h1>
                    <p className="text-muted-foreground">
                        Let&#39;s start with the basic information about your job opening
                    </p>
                </div>
                <StepOneForm orgId={departments[0].organization_id as string} departments={departments} initialDraft={initialDraft}/>
            </div>
        </HasPermission>
    );
}
