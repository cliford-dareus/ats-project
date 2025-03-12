'use client';

import {Input} from "@/components/ui/input";
import {FormErrors} from "@/types/job-listings-types";
import CustomButton from "@/components/custom-button";
import React, {useActionState, useEffect, useState} from "react";
import {stepTwoFormAction} from "@/app/(dashboard)/jobs/new/step-two/_actions";
import MultiSelect from "@/components/multi-select";
import {techSchema} from "@/zod";
import {FormControl, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {z} from "zod";
import {Plus, X} from "lucide-react";
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";
import {useNewJobContext} from "@/providers/new-job-provider";

const initialState: FormErrors = {};

export default function StepOneForm() {
    const [currentStages, setCurrentStages] = useState<z.infer<typeof techSchema>[]>([]);
    const [serverErrors, formAction] = useActionState(stepTwoFormAction, initialState);
    const form = useForm();
    const {updateNewJobDetails, newJobData, removeJob} = useNewJobContext();

    useEffect(() => {
        setCurrentStages(newJobData.jobTechnology);
    }, [newJobData]);

    return (
        <>
        <div className="flex flex-col items-center mb-8 mt-4">
            <h1 className="text-slate-500">Job Experience</h1>
            <p className="text-2xl font-semibold leading-7">Create job experience</p>
        </div>

        <StepOneCollapse/>

        <form action={formData => {
            formData.append("jobTechnology", JSON.stringify(currentStages))
            formAction(formData)
        }}
            className="flex flex-1 flex-col items-center mt-8">
            <div className="w-full flex flex-col mb-2">
            <h2>Experience</h2>
            <p className="text-slate-500 text-sm">Manage candidates by setting a hiring workflow</p>
            </div>

        {currentStages.length > 0 &&
            <div className="w-full my-4">
            <div className="flex flex-col gap-2 w-full">
        {currentStages.map((item, index) => (
            <div key={index} className="flex bg-muted p-2 min-h-8 rounded border">
            {item.technology} - {item.year_of_experience}
            <div
                className="flex flex-col gap-2 w-full"
                onClick={() => removeJob(item, "jobTechnology")}
            >
                <X className="cursor-pointer" size={20}/>
            </div>
        </div>
        ))}
        </div>
</div>
}

    <MultiSelect
        className="w-full flex flex-col gap-2"
        schema={techSchema}
        fieldName={"jobTechnology"}
        setValue={form.setValue}
        getValues={form.getValues}
        renderForm={(onSubmit, forms) => (
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="w-full py-1 flex items-center justify-center gap-2 text-blue-500">
                    <Plus size={18}/>
                    Add experience
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <FormItem
                        className="flex flex-col justify-between">
                        <FormLabel>Job Name</FormLabel>
                        <FormControl>
                            <Input {...forms.register("technology")}
                                   className="w-full" placeholder="Acme"/>
                        </FormControl>
                        <FormMessage/>
                    </FormItem>

                    <FormItem
                        className="flex flex-col justify-between">
                        <FormLabel>Job Name</FormLabel>
                        <FormControl>
                            <Input {...forms.register("year_of_experience")}
                                   className="w-full" placeholder="Acme"/>
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                    <Button onClick={() => {
                        form.setValue('jobTechnology', currentStages);
                        onSubmit(forms.watch() as z.infer<typeof techSchema>)
                        updateNewJobDetails(forms.watch() as z.infer<typeof techSchema>, "jobTechnology")
                    }}>Add</Button>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
    />
    <CustomButton className="" text="Continue"/>
</form>
</>
)
    ;
}