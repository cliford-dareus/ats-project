import StepReviewForm from "@/app/(dashboard)/jobs/new/_component/forms/step-review-form";
import { HasPermission } from "@/components/has-permission";

const Page = async () => {
    return(
        <HasPermission permission="job:create" renderFallback fallbackText="You need permission to create job listings to use the job wizard.">
            <div className="py-8">
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-gray-900 uppercase leading-none">Review & Publish</h1>
                    <p className="text-gray-600">Review your job listing before publishing</p>
                </div>
                <StepReviewForm />
            </div>
        </HasPermission>
    )
};

export default Page;