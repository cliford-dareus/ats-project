import { HasPermission } from "@/components/has-permission";
import { canCreateJob } from "@/server/permissions";

export default function StepThreeForm() {
    return (
        <div className="py-8">
            {/* Header */}
            <div className="my-2">
                <h1 className="text-3xl font-bold text-gray-900 uppercase leading-none">Hiring Workflow</h1>
                <p className="text-zinc-500">Design your hiring pipeline and interview process</p>
            </div>

            <div>
                <HasPermission
                    permission={canCreateJob}
                    renderFallback={true}
                    fallbackText="You do not have permission to perform this action."
                >
                    <StepThreeForm />
                </HasPermission>
            </div>
        </div>
    );
};
