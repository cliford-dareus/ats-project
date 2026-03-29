"use client";

import {FormErrors} from "@/types";
import CustomButton from "@/components/custom-button";
import React, {useActionState, useEffect, useState} from "react";
import {stepThreeFormAction} from "@/app/(dashboard)/jobs/new/step-three/_actions";
import {JOB_ENUM, jobStageSchema} from "@/zod";
import {z} from "zod";
import {Plus, X, Users, Settings, Workflow, GripVertical} from "lucide-react";
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";
import StepTwoCollapse from "@/app/(dashboard)/jobs/new/_component/step-two-collapse";
import {useNewJobContext} from "@/providers/new-job-provider";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ScrollArea} from "@/components/ui/scroll-area";
import SidePreview from "@/app/(dashboard)/jobs/new/_component/side-preview";

const initialState: FormErrors = {};

const STAGE_COLORS = [
    {name: 'Blue', value: '#3B82F6', class: 'bg-blue-500'},
    {name: 'Green', value: '#10B981', class: 'bg-green-500'},
    {name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500'},
    {name: 'Orange', value: '#F59E0B', class: 'bg-orange-500'},
    {name: 'Red', value: '#EF4444', class: 'bg-red-500'},
    {name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500'},
    {name: 'Pink', value: '#EC4899', class: 'bg-pink-500'},
    {name: 'Teal', value: '#14B8A6', class: 'bg-teal-500'},
];

const JOB_STAGES = [
    'New Candidate',
    'Screening',
    'Phone Interview',
    'Interview',
    'Offer',
    'Drafted'
];

const StepThreeForm = () => {
    const [currentStages, setCurrentStages] = useState<z.infer<typeof jobStageSchema>[]>([]);
    const [serverErrors, formAction] = useActionState(stepThreeFormAction, initialState);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newStage, setNewStage] = useState<z.infer<typeof jobStageSchema>>({
        stage_name: 'New Candidate',
        stage_assign_to: '',
        need_schedule: false,
        color: '#3B82F6'
    });
    const {updateStageOptions, newJobData} = useNewJobContext();

    useEffect(() => {
        setCurrentStages(newJobData.jobStages);
    }, [newJobData]);

    const handleAddStage = () => {
        if (newStage.stage_name && newStage.stage_assign_to) {
            const updatedStages = [...currentStages, newStage];
            setCurrentStages(updatedStages);
            updateStageOptions(updatedStages);
            setNewStage({
                stage_name: 'New Candidate',
                stage_assign_to: '',
                need_schedule: false,
                color: '#3B82F6'
            });
            setIsDialogOpen(false);
        }
    };

    const handleRemoveStage = (index: number) => {
        const updatedStages = currentStages.filter((_, i) => i !== index);
        setCurrentStages(updatedStages);
        updateStageOptions(updatedStages);
    };

    // const moveStage = (fromIndex: number, toIndex: number) => {
    //     const updatedStages = [...currentStages];
    //     const [movedStage] = updatedStages.splice(fromIndex, 1);
    //     updatedStages.splice(toIndex, 0, movedStage);
    //     setCurrentStages(updatedStages);
    //     updateStageOptions(updatedStages);
    // };

    return (
        <form action={formData => {
            formData.append("jobStages", JSON.stringify(currentStages));
            formAction(formData);
        }} className="w-full flex gap-4 h-[calc(100vh_-_200px)]">
            <ScrollArea className=" flex-1">
                {/* Workflow Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Workflow size={20} className="text-blue-500"/>
                            Hiring Pipeline
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            Create stages that candidates will move through during the hiring process
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Default Applied Stage */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">1</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">Applied</h3>
                                    <p className="text-sm text-gray-600">Default stage for new applications</p>
                                </div>
                                <Badge variant="secondary">Default</Badge>
                            </div>
                        </div>

                        {/* Custom Stages */}
                        {currentStages.length > 0 && (
                            <div className="space-y-3">
                                {currentStages.map((stage, index) => (
                                    <div key={index}
                                         className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
                                            >
                                                <GripVertical size={16}/>
                                            </button>

                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{backgroundColor: stage.color}}
                                            >
                                                <span
                                                    className="text-white text-sm font-medium">{index + 2}</span>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900">{stage.stage_name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <p className="text-sm text-gray-600">
                                                        <Users size={14} className="inline mr-1"/>
                                                        Assigned to: {stage.stage_assign_to}
                                                    </p>
                                                    {stage.need_schedule && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <Settings size={12} className="mr-1"/>
                                                            Requires Scheduling
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveStage(index)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <X size={16}/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Stage Button */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full h-12 border-dashed">
                                    <Plus size={18} className="mr-2"/>
                                    Add Hiring Stage
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add New Hiring Stage</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="stage_name">Stage Name</Label>
                                        <Select
                                            name="stage_name"
                                            onValueChange={(value) => setNewStage({
                                                ...newStage,
                                                stage_name: value as JOB_ENUM
                                            })}
                                        >
                                            <SelectTrigger className="">
                                                <SelectValue placeholder="Select a stage name"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {JOB_STAGES.map(stage => (
                                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="stage_assign_to">Assign To</Label>
                                        <Input
                                            id="stage_assign_to"
                                            placeholder="e.g. HR Manager, Engineering Team"
                                            value={newStage.stage_assign_to}
                                            onChange={(e) => setNewStage({
                                                ...newStage,
                                                stage_assign_to: e.target.value
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Stage Color</Label>
                                        <div className="flex gap-2 flex-wrap">
                                            {STAGE_COLORS.map((color) => (
                                                <button
                                                    key={color.value}
                                                    type="button"
                                                    className={`w-8 h-8 rounded-full ${color.class} ${newStage.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                                                    }`}
                                                    onClick={() => setNewStage({
                                                        ...newStage,
                                                        color: color.value
                                                    })}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="need_schedule"
                                            checked={newStage.need_schedule}
                                            onCheckedChange={(checked) => setNewStage({
                                                ...newStage,
                                                need_schedule: checked
                                            })}
                                        />
                                        <Label htmlFor="need_schedule" className="text-sm">
                                            Requires scheduling (interviews, assessments)
                                        </Label>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsDialogOpen(false)}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleAddStage}
                                            className="flex-1"
                                            disabled={!newStage.stage_name || !newStage.stage_assign_to}
                                        >
                                            Add Stage
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Workflow Preview */}
                        {currentStages.length > 0 && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h3 className="font-medium text-primary mb-3">Workflow Preview</h3>
                                <div className="flex items-center gap-2 overflow-x-auto">
                                    <Badge variant="secondary">Applied</Badge>
                                    {currentStages.map((stage, index) => (
                                        <React.Fragment key={index}>
                                            <div className="w-2 h-0.5 bg-blue-300"/>
                                            <Badge
                                                variant="secondary"
                                                style={{
                                                    backgroundColor: stage.color + '20',
                                                    color: stage.color
                                                }}
                                            >
                                                {stage.stage_name}
                                            </Badge>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </ScrollArea>

            {/* Previous Steps Summary */}
            <div className="flex flex-col relative">
                <SidePreview/>
                {/* Action Buttons */}
                <div className="w-full flex items-center justify-between absolute bottom-4">
                    <Button variant="outline" type="button" onClick={() => window.history.back()}>
                        Back
                    </Button>
                    <CustomButton
                        text="Continue to Review"
                        className="px-8 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    />
                </div>
            </div>
        </form>
    );
};

export default StepThreeForm;
