'use client';

import {useFormState} from 'react-dom';
import {Input} from "@/components/ui/input";
import {FormErrors} from "@/types/job-listings-types";
import CustomButton from "@/components/custom-button";
import React, {useActionState} from "react";
import {stepTwoFormAction} from "@/app/(dashboard)/jobs/new/step-two/_actions";
import MultiSelect from "@/components/multi-select";
import {techSchema} from "@/schema";
import {FormControl, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {z} from "zod";
import {Plus} from "lucide-react";
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";

const initialState: FormErrors = {};

export default function StepOneForm() {
    const [serverErrors, formAction] = useActionState(stepTwoFormAction, initialState);
    const form = useForm()

    return (
        <>
            <div className="flex flex-col items-center mb-8 mt-4">
                <h1 className="text-slate-500">Job Experience</h1>
                <p className="text-2xl font-semibold leading-7">Create job experience</p>
            </div>

            <StepOneCollapse />

            <form action={formAction} className="flex flex-1 flex-col items-center mt-8">
                {/*<div className="flex w-full  items-center gap-2 border bg-muted min-h-8 p-2 rounded mb-4"></div>*/}
                <MultiSelect
                    className="w-full flex flex-col gap-2"
                    schema={techSchema}
                    fieldName={"jobTechnology"}
                    setValue={form.setValue}
                    getValues={form.getValues}
                    renderForm={(onSubmit, forms) => (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="w-full border py-1 rounded flex items-center justify-center gap-4">
                                <Plus size={20}/>
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
                                <Button onClick={() => onSubmit(forms.watch() as z.infer<typeof techSchema>)}>Add</Button>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    renderSelectedItems={(items, onRemove) => (
                        <div className="flex flex-col gap-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex">
                                    {item.technology} - {item.year_of_experience}
                                    <button onClick={() => onRemove(index)}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                />
            </form>
            <CustomButton text="Add job experience"/>
        </>
    );
}