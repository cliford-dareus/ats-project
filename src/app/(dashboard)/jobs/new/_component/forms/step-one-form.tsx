"use client";

import { Input } from "@/components/ui/input";
import { FormErrors } from "@/types/index";
import CustomButton from "@/components/custom-button";
import React, { useActionState, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNewJobContext } from "@/providers/new-job-provider";
import { useOrganization, useUser } from "@clerk/nextjs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, DollarSign, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidePreview from "@/app/(dashboard)/jobs/new/_component/side-preview";
import { get_dept, stepOneFormAction } from "../../step-one/_actions";
import { JOB_TYPE } from "@/zod";

const initialState: FormErrors = {};

type Props = {
    orgId: string;
    departments: { id: number, organization_id: string, name: string | null }[]
}

const StepOneForm = ({ orgId, departments }: Props) => {
    const [serverErrors, formAction] = useActionState(stepOneFormAction, initialState);
    const { updateNewJobDetails, newJobData } = useNewJobContext();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNewJobDetails({ [e.target.name]: e.target.value }, "jobInfo");
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNewJobDetails({ [e.target.name]: e.target.value }, "jobInfo");
    };

    const handleSelectChange = (value: string) => {
        updateNewJobDetails({ department: value, organization: orgId }, "jobInfo");
    };

    return (
        <form action={formAction} className="w-full flex gap-4 h-[calc(100vh_-_200px)]">
            <ScrollArea className="flex-1">
                {/* Job Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <FileText size={20} className="text-blue-500" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job_name" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    Job Title *
                                </Label>
                                <Input
                                    type="text"
                                    id="job_name"
                                    name="job_name"
                                    placeholder="e.g. Senior Software Engineer"
                                    onChange={handleInputChange}
                                    defaultValue={newJobData.jobInfo["job_name"]}
                                    className="h-11"
                                />
                                {serverErrors?.job_name && (
                                    <p className="text-sm text-red-600">{serverErrors.job_name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="job_location" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <MapPin size={16} className="inline mr-1" />
                                    Location *
                                </Label>
                                <Input
                                    type="text"
                                    id="job_location"
                                    name="job_location"
                                    placeholder="e.g. New York, NY"
                                    onChange={handleInputChange}
                                    defaultValue={newJobData.jobInfo["job_location"]}
                                    className="h-11"
                                />
                                {serverErrors?.job_location && (
                                    <p className="text-sm text-red-600">{serverErrors.job_location}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="department" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <Building2 size={16} className="inline mr-1" />
                                    Department
                                </Label>
                                <Select onValueChange={handleSelectChange}
                                    defaultValue={newJobData.jobInfo["department"]}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={String(dept.id) || ''}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="salary_up_to" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <DollarSign size={16} className="inline mr-1" />
                                    Salary (Annual)
                                </Label>
                                <Input
                                    type="number"
                                    id="salary_up_to"
                                    name="salary_up_to"
                                    placeholder="e.g. 120000"
                                    onChange={handleInputChange}
                                    defaultValue={newJobData.jobInfo["salary_up_to"]}
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="department" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <Building2 size={16} className="inline mr-1" />
                                    Type
                                </Label>
                                <Select onValueChange={handleSelectChange}
                                    defaultValue={newJobData.jobInfo["department"]}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_TYPE.options.map((dept) => (
                                            <SelectItem key={dept} value={String(dept) || ''}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="job_description" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Job Description *
                            </Label>
                            <Textarea
                                id="job_description"
                                name="job_description"
                                placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                                onInput={handleTextAreaChange}
                                defaultValue={newJobData.jobInfo["job_description"]}
                                className="min-h-[120px] resize-none"
                            />
                            {serverErrors?.job_description && (
                                <p className="text-sm text-red-600">{serverErrors.job_description}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </ScrollArea>

            {/* Preview */}
            <div className="flex flex-col relative">
                <SidePreview />
                {/* Action Buttons */}
                <div className="w-full flex items-center justify-between absolute bottom-4">
                    <CustomButton
                        text="Continue to Requirements"
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    />
                </div>
            </div>
        </form>
    )
};

export default StepOneForm;
