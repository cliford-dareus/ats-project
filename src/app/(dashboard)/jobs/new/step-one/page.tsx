import { HasPermission } from '@/components/has-permission';
import { canCreateJob } from '@/server/permissions';
import StepOneForm from '../_component/forms/step-one-form';

export default function Page() {


    return (
        <div className="py-8 w-full h-full">
            {/* Header */}
            <div className="my-2">
                <h1 className="text-3xl font-bold text-gray-900 uppercase leading-none">Job Details</h1>
                <p className="text-zinc-500">Let&#39;s start with the basic information about your job opening</p>
            </div>

            <>
                <HasPermission
                    permission={canCreateJob}
                    renderFallback={true}
                    fallbackText="You do not have permission to perform this action."
                >
                    <StepOneForm />
                </HasPermission>
            </>
        </div>
    );
}
