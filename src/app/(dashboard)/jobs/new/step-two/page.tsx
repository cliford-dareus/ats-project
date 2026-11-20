import StepTwoForm from "../_component/forms/step-two-form";
import { HasPermission } from "@/components/has-permission";

export default async function Page() {
    return (
        <HasPermission permission="job:create" renderFallback fallbackText="You need permission to create job listings to use the job wizard.">
            <div className="py-8">
                {/* Header */}
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">Requirements</h1>
                    <p className="text-muted-foreground">Define the skills and experience needed for this role</p>
                </div>
                <StepTwoForm/>
            </div>  
        </HasPermission>
    );
};
