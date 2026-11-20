import StepOneForm from "../_component/forms/step-one-form";
import {get_dept} from "@/app/(dashboard)/jobs/new/step-one/_actions";
import { HasPermission } from "@/components/has-permission";

export default async function Page() {
    const departments = await get_dept();
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
                <StepOneForm orgId={departments[0].organization_id as string} departments={departments}/>
            </div>
        </HasPermission>
    );
}
