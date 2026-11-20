import StepThreeForm from "@/app/(dashboard)/jobs/new/_component/forms/step-three-form";
import { HasPermission } from "@/components/has-permission";
import { get_users } from "./_actions";

export default async function Page() {
    const users = await get_users();
    return (
        <HasPermission permission="job:create" renderFallback fallbackText="You need permission to create job listings to use the job wizard.">
            <div className="py-8">
                {/* Header */}
                <div className="my-2">
                    <h1 className="text-3xl font-bold text-foreground uppercase leading-none">Hiring Workflow</h1>
                    <p className="text-muted-foreground">Design your hiring pipeline and interview process</p>
                </div>
                <StepThreeForm users={users}/>
            </div>
        </HasPermission>
    );
};
