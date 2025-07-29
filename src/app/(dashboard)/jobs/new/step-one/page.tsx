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
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Building2, MapPin, DollarSign, FileText} from "lucide-react";

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
                    const organizationData = await get_dept(organization.id);
                    setDepartment(organizationData);
                }
            } catch (error) {
                console.error("Error fetching organization data:", error);
            }
        };
        fetchOrganization();
    }, [user]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
                <p className="text-gray-600">Let's start with the basic information about your job opening</p>
            </div>

            <form action={formAction} className="space-y-8">
                {/* Job Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={20} className="text-blue-500" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job_name" className="text-sm font-medium text-gray-700">
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
                                <Label htmlFor="job_location" className="text-sm font-medium text-gray-700">
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
                                <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                                    <Building2 size={16} className="inline mr-1" />
                                    Department
                                </Label>
                                <Select onValueChange={handleSelectChange} defaultValue={newJobData.jobInfo["department"]}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {department.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id || ''}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="salary_up_to" className="text-sm font-medium text-gray-700">
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

                        <div className="space-y-2">
                            <Label htmlFor="job_description" className="text-sm font-medium text-gray-700">
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

                {/* Action Buttons */}
                <div className="flex justify-end pt-6 border-t">
                    <CustomButton
                        text="Continue to Requirements"
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    />
                </div>
            </form>
        </div>
    );
}
