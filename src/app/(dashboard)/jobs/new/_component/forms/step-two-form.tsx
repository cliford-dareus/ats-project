"use client";

import { Input } from "@/components/ui/input";
import { FormErrors } from "@/types";
import CustomButton from "@/components/custom-button";
import React, { useActionState, useEffect, useState } from "react";
import { stepTwoFormAction } from "@/app/(dashboard)/jobs/new/step-two/_actions";
import MultiSelect from "@/components/multi-select";
import { jobTechSchema } from "@/zod";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Plus, X, Code, Award } from "lucide-react";
import { useNewJobContext } from "@/providers/new-job-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidePreview from "@/app/(dashboard)/jobs/new/_component/side-preview";

const initialState: FormErrors = {};

const StepTwoForm = () => {
    const [currentStages, setCurrentStages] = useState<z.infer<typeof jobTechSchema>[]>([]);
    const [, formAction] = useActionState(stepTwoFormAction, initialState);
    const { updateNewJobDetails, newJobData, removeJob } = useNewJobContext();
    const form = useForm();

    useEffect(() => {
        setCurrentStages(newJobData.jobTechnology);
    }, [newJobData]);

    return (
        <form action={formData => {
            formData.append("jobTechnology", JSON.stringify(currentStages))
            formAction(formData)
        }} className="w-full flex gap-4 h-[calc(100vh_-_200px)]">
            <ScrollArea className="flex-1">
                {/* Requirements Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code size={20} className="text-primary" />
                            Technical Requirements
                        </CardTitle>
                        <p className="text-sm text-gray-600">Add the technologies and experience levels required</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Current Requirements */}
                        {currentStages.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-medium text-foreground">Added Requirements</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {currentStages.map((item, index) => (
                                        <div key={index}
                                            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Award size={16} className="text-primary" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.technology}</p>
                                                    <p className="text-sm text-foreground/60">{item.year_of_experience} years
                                                        experience</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeJob(item, "jobTechnology")}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Requirement */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <MultiSelect
                                className="w-full"
                                schema={jobTechSchema}
                                fieldName={"jobTechnology"}
                                setValue={form.setValue}
                                getValues={form.getValues}
                                renderForm={(onSubmit, forms) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-12 border-dashed">
                                                <Plus size={18} className="mr-2" />
                                                Add Technical Requirement
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-80 p-4">
                                            <div className="space-y-4">
                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Technology/Skill</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...forms.register("technology")}
                                                            placeholder="e.g. React, Python, AWS"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>

                                                <FormItem>
                                                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Years of Experience</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...forms.register("year_of_experience")}
                                                            type="number"
                                                            placeholder="e.g. 3"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>

                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        form.setValue('jobTechnology', currentStages);
                                                        onSubmit(forms.watch() as z.infer<typeof jobTechSchema>)
                                                        updateNewJobDetails(forms.watch() as z.infer<typeof jobTechSchema>, "jobTechnology")
                                                    }}
                                                    className="w-full"
                                                >
                                                    Add Requirement
                                                </Button>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </ScrollArea>

            {/* Previous Steps Summary */}
            <div className="flex flex-col relative">
                <SidePreview />
                {/* Action Buttons */}
                <div className="w-full flex items-center justify-between absolute bottom-4">
                    <Button variant="outline" type="button" onClick={() => window.history.back()}>
                        Back
                    </Button>
                    <CustomButton
                        text="Continue to Workflow"
                        className="px-8 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    />
                </div>
            </div>
        </form>
    );
};

export default StepTwoForm;
