import { HasPermission } from "@/components/has-permission";
import { canCreateJob } from "@/server/permissions";
import StepTwoForm from "../_component/forms/step-two-form";

export default function Page() {
    return (
        <div className="py-8">
            {/* Header */}
            <div className="my-2">
                <h1 className="text-3xl font-bold text-gray-900 uppercase leading-none">Requirements</h1>
                <p className="text-zinc-500">Define the skills and experience needed for this role</p>
            </div>

            <>
                <HasPermission
                    permission={canCreateJob}
                    renderFallback={true}
                    fallbackText="You do not have permission to perform this action."
                >
                    <StepTwoForm />
                </HasPermission>
            </>
        </div>
    );
};
