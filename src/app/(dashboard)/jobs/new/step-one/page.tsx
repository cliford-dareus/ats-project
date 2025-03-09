'use client';

import {get_dept, stepOneFormAction} from './_actions';
import {Input} from "@/components/ui/input";
import {FormErrors} from "@/types/index";
import CustomButton from "@/components/custom-button";
import React, {useActionState, useEffect, useState} from "react";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {useNewJobContext} from "@/providers/new-job-provider";
import {useOrganization, useUser} from "@clerk/nextjs";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

const initialState: FormErrors = {};

export default function StepOneForm() {
    const [department, setDepartment] = useState<{ id: number, organization_id: string, name: string | null }[]>([]);
    const [serverErrors, formAction] = useActionState(stepOneFormAction, initialState);
    const {updateNewJobDetails, newJobData} = useNewJobContext();
    const { organization } = useOrganization();
    const {user} = useUser();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNewJobDetails({[e.target.name]: e.target.value}, "jobInfo");
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNewJobDetails({[e.target.name]: e.target.value}, "jobInfo");
    };

    const handleSelectChange = (value: string) => {
        updateNewJobDetails({department: value, organization: organization?.id}, "jobInfo");
    };

    useEffect(() => {
        const fetchOrganization = async () => {
            try {
                if (organization) {
                    const organizationData = await get_dept(
                        organization.id
                    );
                    setDepartment(organizationData);
                }
            } catch (error) {
                console.error("Error fetching organization data:", error);
            }
        };

        fetchOrganization(); // Call the async function
    }, [user]);

    console.log(department);

    return (
        <>
            <div className="flex flex-col items-center mb-8 mt-4">
                <h1 className="text-slate-500">Job Information</h1>
                <p className="text-2xl font-semibold leading-7">Create your job listing</p>
            </div>

            <form action={formAction} className="flex flex-1 flex-col items-center">
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_name" className="font-semibold text-xl">Job Name</Label>
                    <Input type="text" id="job_name" name="job_name" placeholder="Job Name" onChange={handleInputChange}
                           defaultValue={newJobData.jobInfo["job_name"]}/>
                </div>
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_location" className="font-semibold text-xl">Job Location</Label>
                    <Input type="text" id="job_location" name="job_location" placeholder="New York"
                           onChange={handleInputChange} defaultValue={newJobData.jobInfo["job_location"]}/>
                </div>

                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_location" className="font-semibold text-xl">Department</Label>
                    <Select onValueChange={handleSelectChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a department..."/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Department</SelectLabel>
                                {
                                    department.map((department) => (
                                        <SelectItem key={department.id} value={String(department.id!)}>{department.name}</SelectItem>
                                    ))
                                }
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_salary" className="font-semibold text-xl">Job salary</Label>
                    <Input type="number" id="salary_up_to" name="salary_up_to" placeholder="50000"
                           onChange={handleInputChange} defaultValue={newJobData.jobInfo["salary_up_to"]}/>
                </div>
                <div className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor="job_description" className="font-semibold text-xl">Job Description</Label>
                    <Textarea
                        id="job_description"
                        name="job_description"
                        placeholder="Tell us a little bit about yourself"
                        // className="resize-none"
                        onInput={handleTextAreaChange}
                        defaultValue={newJobData.jobInfo["job_description"]}
                    />
                </div>

                <CustomButton text="Continue"/>
            </form>
        </>
    );
}