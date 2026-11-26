"use client";

import { Input } from "@/components/ui/input";
import { FormErrors } from "@/types/index";
import CustomButton from "@/components/custom-button";
import React, { useActionState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNewJobContext, WIZARD_STORAGE_KEY, type WizardDraftData } from "@/providers/new-job-provider";
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
import { stepOneFormAction } from "../../step-one/_actions";
import { JOB_TYPE } from "@/zod";

const initialState: FormErrors = {};

type Props = {
    orgId: string;
    departments: { id: number, organization_id: string, name: string | null }[]
    // A DRAFT row loaded by the page when resuming from ?draft=<id>.
    initialDraft?: WizardDraftData | null;
}

const StepOneForm = ({ orgId, departments, initialDraft }: Props) => {
    const [serverErrors, formAction] = useActionState(stepOneFormAction, initialState);
    const { updateNewJobDetails, newJobData, draftJobId, loadDraft, resetLocalStorage } = useNewJobContext();

    // Hydrate a resumed draft, or start blank. The provider outlives the
    // wizard (it is mounted at the app root), so after a publish/draft-save
    // the previous job would otherwise linger in memory: when there is no
    // draft to resume and nothing stored in the browser, reset to a clean
    // form. Mid-wizard navigation always has stored data, so it is safe.
    useEffect(() => {
        if (initialDraft) {
            if (initialDraft.draftId !== draftJobId) {
                loadDraft(initialDraft);
            }
            return;
        }
        if (typeof window !== "undefined" && !localStorage.getItem(WIZARD_STORAGE_KEY)) {
            resetLocalStorage();
        }
        // Mount-only: the draft and stored state are fixed at entry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNewJobDetails({ [e.target.name]: e.target.value }, "jobInfo");
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNewJobDetails({ [e.target.name]: e.target.value }, "jobInfo");
    };

    const handleSelectDeptChange = (value: string) => {
        updateNewJobDetails({ department: value, organization: orgId }, "jobInfo");
    };

    const handleSelectJobTypeChange = (value: string) => {
        updateNewJobDetails({ job_type: value }, "jobInfo");
    };

    return (
        <form action={formAction} className="w-full flex gap-4 h-[calc(100vh_-_200px)]">
            {/* The draft row this wizard is editing, if any. */}
            <input type="hidden" name="draftId" value={draftJobId ?? ""} />
            <ScrollArea className="flex-1">
                {/* Job Information Card */}
                <Card className="relative overflow-hidden rounded-md">
                    {/* Decorative background element */}
                    <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>

                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                            <FileText size={20} className="text-blue-500" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {serverErrors?.general && (
                            <p className="text-sm text-red-600">{serverErrors.general}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                                <Label htmlFor="job_location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                                <Label htmlFor="department" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Building2 size={16} className="inline mr-1" />
                                    Department
                                </Label>
                                <Select
                                    // id="department"
                                    name="department"
                                    onValueChange={handleSelectDeptChange}
                                    value={newJobData.jobInfo["department"]}
                                    defaultValue={newJobData.jobInfo["department"]}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent id="department">
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={String(dept.id) || ''}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <DollarSign size={16} className="inline mr-1" />
                                    Salary Range (Annual)
                                </Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Input
                                            type="number"
                                            id="salary_from"
                                            name="salary_from"
                                            placeholder="Min e.g. 80000"
                                            aria-label="Minimum salary (annual)"
                                            onChange={handleInputChange}
                                            defaultValue={newJobData.jobInfo["salary_from"]}
                                            className="h-11"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            id="salary_up_to"
                                            name="salary_up_to"
                                            placeholder="Max e.g. 120000"
                                            aria-label="Maximum salary (annual)"
                                            onChange={handleInputChange}
                                            defaultValue={newJobData.jobInfo["salary_up_to"]}
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="job_type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Building2 size={16} className="inline mr-1" />
                                    Type
                                </Label>
                                <Select
                                    // id="job_type"
                                    name="job_type"
                                    onValueChange={handleSelectJobTypeChange}
                                    value={newJobData.jobInfo["job_type"]}
                                    defaultValue={newJobData.jobInfo["job_type"]}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select job type" />
                                    </SelectTrigger>
                                    <SelectContent id="job_type">
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
                            <Label htmlFor="job_description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                <SidePreview departments={departments} />
                {/* Action Buttons */}
                <div className="w-full flex items-center justify-between absolute bottom-4">
                    <CustomButton
                        text="Continue to Requirements"
                        className="px-8 py-3 rounded-md"
                    />
                </div>
            </div>
        </form>
    )
};

export default StepOneForm;
