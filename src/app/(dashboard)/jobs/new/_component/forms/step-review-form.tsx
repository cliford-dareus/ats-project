'use client';

import React, {useActionState, useTransition} from "react";
import {FormErrors} from "@/types";
import {stepReviewFormAction, saveDraftAction} from "@/app/(dashboard)/jobs/new/step-review/_actions";
import {useNewJobContext} from "@/providers/new-job-provider";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {
    FileText,
    MapPin,
    DollarSign,
    Building2,
    Code,
    Workflow,
    Users,
    CheckCircle,
    Edit,
    // Save
} from "lucide-react";
import Link from "next/link";
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";
import StepTwoCollapse from "@/app/(dashboard)/jobs/new/_component/step-two-collapse";
import {ScrollArea} from "@/components/ui/scroll-area";
import SidePreview from "@/app/(dashboard)/jobs/new/_component/side-preview";

const initialState: FormErrors = {};

export default function StepReviewForm() {
    const [publishErrors, publishAction] = useActionState(stepReviewFormAction, initialState);
    const [draftErrors, draftAction] = useActionState(saveDraftAction, initialState);
    const [isPending, starTransition] = useTransition();
    const {newJobData} = useNewJobContext();

    const createFormDataWithJobData = () => {
        const formData = new FormData();
        formData.append('jobInfo', JSON.stringify(newJobData.jobInfo));
        formData.append('jobTechnology', JSON.stringify(newJobData.jobTechnology));
        formData.append('jobStages', JSON.stringify(newJobData.jobStages));
        return formData;
    };

    const handlePublish = () => {
        const formData = createFormDataWithJobData();
        starTransition(() => {
            publishAction(formData);
        });
        // publishAction(formData);
    };

    const handleSaveDraft = () => {
        const formData = createFormDataWithJobData();
        draftAction(formData);
    };

    return (
        <>
            {/* Error Messages */}
            {(publishErrors?.general || draftErrors?.general) && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <p className="text-red-700 text-sm">
                            {publishErrors?.general || draftErrors?.general}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="w-full flex gap-4">
                <ScrollArea className="w-full h-[calc(100vh_-_220px)]">
                    <div className="space-y-8 flex-1">
                        {/* Job Details Review */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText size={20} className="text-blue-500" />
                                    Job Details
                                </CardTitle>
                                <Link href="/jobs/new/step-one">
                                    <Button variant="outline" size="sm">
                                        <Edit size={16} className="mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">
                                            {newJobData.jobInfo.job_name || 'Job Title Not Set'}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                <span>{newJobData.jobInfo.job_location || 'Location not set'}</span>
                                            </div>
                                            {newJobData.jobInfo.salary_up_to && (
                                                <div className="flex items-center gap-1">
                                                    <DollarSign size={14} />
                                                    <span>${parseInt(newJobData.jobInfo.salary_up_to).toLocaleString()}/year</span>
                                                </div>
                                            )}
                                            {newJobData.jobInfo.department && (
                                                <div className="flex items-center gap-1">
                                                    <Building2 size={14} />
                                                    <span>{newJobData.jobInfo.department}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {newJobData.jobInfo.job_description && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            {newJobData.jobInfo.job_description}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Requirements Review */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Code size={20} className="text-blue-500" />
                                    Technical Requirements
                                </CardTitle>
                                <Link href="/jobs/new/step-two">
                                    <Button variant="outline" size="sm">
                                        <Edit size={16} className="mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {newJobData.jobTechnology.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {newJobData.jobTechnology.map((tech, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-gray-900">{tech.technology}</p>
                                                    <p className="text-sm text-gray-600">{tech.year_of_experience} years experience</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <Code size={24} className="mx-auto mb-2 opacity-50" />
                                        <p>No technical requirements added</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Workflow Review */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Workflow size={20} className="text-blue-500" />
                                    Hiring Workflow
                                </CardTitle>
                                <Link href="/jobs/new/step-three">
                                    <Button variant="outline" size="sm">
                                        <Edit size={16} className="mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Applied Stage (Default) */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">1</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">Applied</h4>
                                            <p className="text-sm text-gray-600">Default stage for new applications</p>
                                        </div>
                                        <Badge variant="secondary">Default</Badge>
                                    </div>

                                    {/* Custom Stages */}
                                    {newJobData.jobStages.length > 0 ? (
                                        newJobData.jobStages.map((stage, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: stage.color }}
                                                >
                                                    <span className="text-white text-sm font-medium">{index + 2}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">{stage.stage_name}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <p className="text-sm text-gray-600">
                                                            <Users size={14} className="inline mr-1" />
                                                            {stage.stage_assign_to}
                                                        </p>
                                                        {stage.need_schedule && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Requires Scheduling
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-gray-500">
                                            <Workflow size={24} className="mx-auto mb-2 opacity-50" />
                                            <p>Only default "Applied" stage will be used</p>
                                        </div>
                                    )}

                                    {/* Workflow Preview */}
                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="font-medium text-blue-900 mb-3">Complete Workflow</h4>
                                        <div className="flex items-center gap-2 overflow-x-auto">
                                            <Badge variant="secondary">Applied</Badge>
                                            {newJobData.jobStages.map((stage, index) => (
                                                <React.Fragment key={index}>
                                                    <div className="w-2 h-0.5 bg-blue-300" />
                                                    <Badge
                                                        variant="secondary"
                                                        style={{ backgroundColor: stage.color + '20', color: stage.color }}
                                                    >
                                                        {stage.stage_name}
                                                    </Badge>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                {/* Previous Steps Summary */}
                <div className="flex flex-col relative h-[calc(100vh_-_200px)]">
                    <SidePreview/>
                    {/* Publish Confirmation */}
                    {/*<Card className="border-green-200 bg-green-50 absolute">*/}
                    {/*    <CardContent className="p-6">*/}
                    {/*        <div className="flex items-center gap-3">*/}
                    {/*            <CheckCircle size={24} className="text-green-600" />*/}
                    {/*            <div>*/}
                    {/*                <h3 className="font-medium text-green-900">Ready to Publish</h3>*/}
                    {/*                <p className="text-sm text-green-700 mt-1">*/}
                    {/*                    Your job listing is complete and ready to be published. Candidates will be able to apply once published.*/}
                    {/*                </p>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    </CardContent>*/}
                    {/*</Card>*/}

                    {/* Action Buttons */}
                    <div className="w-full flex items-center justify-between absolute bottom-2">
                        <div className="w-full flex justify-between gap-2">
                            <Button variant="outline" type="button" onClick={() => window.history.back()}>
                                Back
                            </Button>

                            <Button
                                onClick={handlePublish}
                                className="ml-auto bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <CheckCircle size={16} />
                                Publish Job Listing
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
