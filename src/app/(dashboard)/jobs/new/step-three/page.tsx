'use client'

import React, {useActionState, useEffect, useState} from 'react';
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";
import MultiSelect from "@/components/multi-select";
import {JOB_ENUM, stageSchema} from "@/zod";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Lock, Plus, X} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {z} from "zod";
import CustomButton from "@/components/custom-button";
import {useForm} from "react-hook-form";
import {FormErrors} from "@/types/job-listings-types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useNewJobContext} from "@/providers/new-job-provider";
import {stepThreeFormAction} from "@/app/(dashboard)/jobs/new/step-three/_actions";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";

const initialState: FormErrors = {};

const STAGEOPTIONS = {
    stage_name: "" as JOB_ENUM,
    stage_assign_to: '',
    color: '',
    need_schedule: false,
    type: ''
};

const JOB_STAGES = [
    {name: "New Candidate", color: 'bg-red-500'},
    {name: "Screening", color: 'bg-green-500'},
    {name: "Phone Interview", color: 'bg-blue-500'},
    {name: "Interview", color: 'bg-purple-500'},
    {name: "Offer", color: 'bg-indigo-500'},
];

const Page = () => {
    const [openStage, setOpenStage] = useState<JOB_ENUM | null>(null);
    const [stageOptions, setStageOptions] = useState<z.infer<typeof stageSchema> & { type: string }>(STAGEOPTIONS);
    const [currentStages, setCurrentStages] = useState<z.infer<typeof stageSchema>[]>([]);
    const [serverErrors, formAction] = useActionState(stepThreeFormAction, initialState);
    const form = useForm();
    const {updateNewJobDetails, updateStageOptions, newJobData, removeJob} = useNewJobContext();

    const handleSaveStage = (item: z.infer<typeof stageSchema>) => {
        const newStages = currentStages.map((stage) => {
            if (stage.stage_name === item.stage_name) {
                return stageOptions
            }
            return stage;
        })

        setCurrentStages(newStages);
        updateStageOptions(newStages);
    };

    useEffect(() => {
        setCurrentStages(newJobData.jobStages);
    }, [newJobData]);

    return (
        <>
            <div className="flex flex-col items-center mb-8 mt-4">
                <h1 className="text-slate-500">Workflow</h1>
                <p className="text-2xl font-semibold leading-7">Control your job workflow</p>
            </div>

            <StepOneCollapse/>

            <form
                action={formData => {
                    formData.append("jobStages", JSON.stringify(currentStages));
                    formAction(formData);
                }}
                className="flex flex-1 flex-col items-center mt-8"
            >
                <div className="w-full flex flex-col mb-2">
                    <h2>Pipeline</h2>
                    <p className="text-slate-500 text-sm">Manage candidates by setting a hiring workflow</p>
                </div>

                <div
                    className="flex w-full justify-between items-center gap-2 border bg-muted min-h-8 p-2 rounded mb-2">
                    <div className="flex items-center gap-4">
                        <span className="w-4 h-4 rounded bg-slate-700"></span>
                        <p>Applied</p>
                    </div>
                    <Lock size={18}/>
                </div>

                {currentStages.length > 0 &&
                    <div className="w-full">
                        <div className="flex flex-col gap-2 w-full">
                            {currentStages.map((item, index) => (
                                <div
                                    key={index}
                                >
                                    <div
                                        className="relative flex bg-muted justify-between items-center w-full p-2 min-h-8 rounded border"
                                        onClick={() => {
                                            setOpenStage(item.stage_name as JOB_ENUM)
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={cn([JOB_STAGES[index].color], "w-4 h-4 rounded")}></span>
                                            <p className="w-[150px]">{item.stage_name}</p>
                                        </div>
                                        <div
                                            className="flex items-center justify-between w-[30px] absolute right-0 top-0 bottom-0"
                                            onClick={() => removeJob(item, "jobStages")}
                                        >
                                            <X className="cursor-pointer" size={20}/>
                                        </div>

                                    </div>
                                    {openStage === item.stage_name &&
                                        <div className="w-full border p-4 flex flex-col gap-4">
                                            {/* TODO: FIX THE OPTION ALTERING ALL OF THE STAGE */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <Label>Stage Name</Label>
                                                    <Input
                                                        defaultValue={item.stage_name}
                                                        // value={stageOptions.stage_name}
                                                        onChange={(e) => {
                                                            setStageOptions({
                                                                ...stageOptions,
                                                                stage_name: e.target.value as JOB_ENUM
                                                            });
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex-2">
                                                    <Label>Type</Label>
                                                    <Select value={stageOptions.type} onValueChange={(value) => {
                                                        setStageOptions({...stageOptions, type: value})
                                                    }}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a fruit"/>
                                                        </SelectTrigger>
                                                        <SelectContent>

                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Label>Can contact</Label>
                                                <Switch
                                                    checked={item.need_schedule}
                                                    onCheckedChange={() => setStageOptions({
                                                        ...stageOptions, need_schedule: !stageOptions.need_schedule,
                                                    })}
                                                />
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Button variant="outline">Cancel</Button>
                                                <Button onClick={() => {
                                                    setOpenStage(null);
                                                    handleSaveStage(item);
                                                }}
                                                >Save</Button>
                                            </div>
                                        </div>}
                                </div>
                            ))}
                        </div>
                    </div>
                }

                <MultiSelect
                    className="w-full flex flex-col gap-2"
                    schema={stageSchema}
                    fieldName={"jobStages"}
                    setValue={form.setValue}
                    getValues={form.getValues}
                    renderForm={(onSubmit, forms) => (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                className="w-full text-blue-500 py-1 rounded flex items-center justify-center gap-2">
                                <Plus size={18}/>
                                Add new pipeline stage
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <Select
                                    {...forms.register("stage_name")}
                                    onValueChange={(e) => forms.setValue("stage_name", e)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select a fruit"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_STAGES.map(stage => (
                                            <SelectItem key={stage.name}
                                                        value={stage.name}>{stage.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input {...forms.register('stage_assign_to')} placeholder="Years of Experience"/>
                                <Button
                                    onClick={() => {
                                        onSubmit(forms.watch() as z.infer<typeof stageSchema>)
                                        updateNewJobDetails({
                                            ...forms.watch() as z.infer<typeof stageSchema>,
                                            color: JOB_STAGES.find(d => d.name == forms.watch().stage_name)?.color,
                                            need_schedule: false
                                        }, "jobStages")
                                    }}>Add</Button>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                />
                <CustomButton text="Continue"/>
            </form>
        </>
    );
};

export default Page;