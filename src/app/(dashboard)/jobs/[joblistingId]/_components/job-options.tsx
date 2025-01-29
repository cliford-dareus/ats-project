'use client'

import React, {useActionState, useState} from 'react';
import {FormErrors, JobResponseType, StageResponseType} from "@/types/job-listings-types";
import {JOB_ENUM, JOB_STAGES, JOB_STATUS} from "@/schema";
import {cn} from "@/lib/utils";
import {Plus} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {update_job_listing} from "@/app/(dashboard)/jobs/[joblistingId]/_actions/job-options-actions";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";

type Props = {
    data: JobResponseType[];
    stages: StageResponseType[];
    job_id: number;
};

const initialState: FormErrors = {};

const JobOptions = ({data, stages, job_id}: Props) => {
    const [serverErrors, formAction] = useActionState(update_job_listing, initialState);
    const [openStage, setOpenStage] = useState<JOB_ENUM>();
    console.log(data.filter((job) => job.id === job_id));
    const currentJob = data.filter((job) => job.id === job_id)

    return (
        <div className="p-4 overflow-hidden h-[calc(100vh-200px)] flex gap-4">
            <div className="flex-1 flex flex-col gap-4 p-4 border rounded">
                <div>
                    <div className="mb-2">
                        <h2>Customize info</h2>
                        <p className="text-slate-500 text-sm">Customize this job information</p>
                    </div>
                    <div className="">
                        {/*   TODO:
                         */}
                        <form action={formAction} className="flex flex-col gap-4">
                            <div>
                                <Label>Job name</Label>
                                <Input
                                    type="text"
                                    name="job_name"
                                    defaultValue={currentJob[0]?.name}
                                />
                            </div>
                            <div>
                                <Label>Job status</Label>
                                <Select name="job_status">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a job status"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            JOB_STATUS.map((status) => (
                                                <SelectItem
                                                    key={status}
                                                    value={status}>{status.slice(0, 1) + status.slice(1).toLowerCase()}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label></Label>
                                <Switch name="switch"/>
                            </div>
                            <Button type="submit">Update</Button>
                        </form>
                    </div>
                </div>

                <div>
                    <div className="mb-2">
                        <h2>Customize pipeline</h2>
                        <p className="text-slate-500 text-sm">Customize this job listing workflow</p>
                    </div>
                    {stages?.map((stage) => (
                        <div key={stage.id}>
                            <div
                                className="relative flex bg-muted justify-between items-center w-full p-2 min-h-8 rounded border"
                                onClick={() => {
                                    setOpenStage(stage.stage_name as JOB_ENUM)
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <span className={cn(stage.color, "w-4 h-4 rounded")}></span>
                                    <p className="w-[150px]">{stage.stage_name}</p>
                                </div>
                            </div>

                            {openStage === stage.stage_name &&
                                <div className="w-full border p-4 flex flex-col gap-4 h-10">

                                </div>
                            }
                        </div>
                    ))}

                    <div className="flex justify-center mt-2">
                        <Dialog>
                            <DialogTrigger>
                             <span
                                 className="flex items-center gap-2 cursor-pointer text-blue-500 text-sm"
                             >
                                    <Plus size={18}/>
                                    <p>Add new stage</p>
                            </span>
                            </DialogTrigger>
                            <DialogContent>
                                <CreateNewStage/>
                            </DialogContent>
                        </Dialog>
                    </div>

                </div>
            </div>
            <div className="w-[40%] h-full border rounded"></div>
        </div>
    );
};

export const CreateNewStage = () => {
    return (
        <div className="">
            <div>
                <DialogTitle>Add new stage</DialogTitle>
                <DialogDescription></DialogDescription>
            </div>

            <form className="flex flex-col gap-4 mt-4">
                <div>
                    <Label>Stage name</Label>
                    <Select name="stage_name">
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

                <div>
                    <Label>Stage assign to</Label>
                    <Input
                        type="text"
                        name="stage_assign_to"
                    />
                </div>

                <div>
                    <Label>Color</Label>
                    <Input
                        type="color"
                        name="color"
                    />
                </div>

                <div>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </div>
    )
}

export default JobOptions;