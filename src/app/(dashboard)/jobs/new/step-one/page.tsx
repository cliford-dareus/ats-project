'use client';

import {useFormState} from 'react-dom';
import {stepOneFormAction} from './_actions';
import {Input} from "@/components/ui/input";
import {FormErrors} from "@/types/job-listings-types";
import CustomButton from "@/components/custom-button";
import React, {useActionState} from "react";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

const initialState: FormErrors = {};

export default function StepOneForm() {
    const [serverErrors, formAction] = useActionState(stepOneFormAction, initialState);

    return (
        <>
            <div className="flex flex-col items-center mb-8 mt-4">
                <h1 className="text-slate-500">Job Information</h1>
                <p className="text-2xl font-semibold leading-7">Create your job listing</p>
            </div>

            <form action={formAction} className="flex flex-1 flex-col items-center">
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_name" className="font-semibold text-xl">Job Name</Label>
                    <Input type="email" id="job_name" placeholder="Job Name"/>
                </div>
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_location" className="font-semibold text-xl">Job Location</Label>
                    <Input type="text" id="job_location" placeholder="New York"/>
                </div>
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_salary" className="font-semibold text-xl">Job salary</Label>
                    <Input type="number" id="job_salary" placeholder="50000"/>
                </div>
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_description" className="font-semibold text-xl">Job Description</Label>
                    <Textarea
                        id="job_description"
                        placeholder="Tell us a little bit about yourself"
                        // className="resize-none"
                    />
                </div>
            </form>
        </>
    );
}