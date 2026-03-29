import StepReviewForm from "@/app/(dashboard)/jobs/new/_component/forms/step-review-form";

const Page = async () => {
    return(
        <div className="py-8">
            <div className="my-2">
                <h1 className="text-3xl font-bold text-gray-900 uppercase leading-none">Review & Publish</h1>
                <p className="text-gray-600">Review your job listing before publishing</p>
            </div>
            <StepReviewForm />
        </div>
    )
};

export default Page;