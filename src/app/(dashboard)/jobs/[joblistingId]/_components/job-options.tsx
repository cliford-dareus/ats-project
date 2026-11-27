'use client'

import React, {useActionState, useEffect, useState} from 'react';
import {ACTION_LABELS, AutomationRule, FormErrors, JobResponseType, StageResponseType} from "@/types";
import {JOB_ENUM, JOB_STAGES, JOB_STATUS} from "@/zod";
import {cn} from "@/lib/utils";
import {Plus} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {update_job_listing} from "@/app/(dashboard)/jobs/[joblistingId]/_actions/job-options-actions";
import {create_stage_action} from "@/server/actions/stage_actions";
import {getJobAutomationRules} from "@/server/actions/plugin-actions";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {formatSalaryRange} from "@/lib/format-salary-range";
import {formatJobTypeLabel} from "@/lib/job-display";

type Props = {
    data: JobResponseType[];
    stages: StageResponseType[];
    job_id: number;
};

const initialState: FormErrors = {};

const JobOptions = ({data, stages, job_id}: Props) => {
    const [serverErrors, formAction] = useActionState(update_job_listing, initialState);
    const [openStage, setOpenStage] = useState<JOB_ENUM>();
    const [stageDialogOpen, setStageDialogOpen] = useState(false);
    // Automation rules for this job, so an expanded stage can show the
    // rules that actually fire when a candidate reaches it (same loader
    // the kanban uses). Stage triggers themselves are not implemented —
    // these are the job's automation rules, not per-stage trigger rows.
    const [rules, setRules] = useState<AutomationRule[]>([]);
    useEffect(() => {
        let cancelled = false;
        getJobAutomationRules(job_id)
            .then((loaded) => {
                if (!cancelled) setRules(loaded);
            })
            .catch(() => {
                // Rules failing to load must not break the stage list.
            });
        return () => {
            cancelled = true;
        };
    }, [job_id]);
    const rulesForStage = (stageName: string) =>
        rules.filter((r) => r.trigger.event === "stage_changed" && r.trigger.toStage === stageName);
    // console.log(data.filter((job) => job.id === job_id));
    const currentJob = data.filter((job) => job.id === job_id);

    // TODO : Check if smart trigger is activated for the organization
    // TODO : add a guard to prevent trigger use when trigger is not activated

    return (
        <div className="p-4 overflow-hidden h-[calc(100vh-200px)] flex gap-4">
            <div className="flex-1 flex flex-col gap-4 p-4 border rounded">
                <div>
                    <div className="mb-2">
                        <h2>Customize info</h2>
                        <p className="text-muted-foreground text-sm">Customize this job information</p>
                    </div>
                    <div className="">
                        <form action={formAction} className="flex flex-col gap-4">
                            <input type="hidden" name="job_id" value={job_id} />
                            {serverErrors._form && (
                                <p role="alert" className="text-sm text-destructive">{serverErrors._form}</p>
                            )}
                            {serverErrors._success && (
                                <p role="status" className="text-sm text-emerald-600">{serverErrors._success}</p>
                            )}
                            <div>
                                <Label>Job name</Label>
                                <Input
                                    type="text"
                                    name="job_name"
                                    defaultValue={currentJob[0]?.name}
                                />
                                {serverErrors.job_name && (
                                    <p role="alert" className="text-sm text-destructive mt-1">{serverErrors.job_name}</p>
                                )}
                            </div>
                            <div>
                                <Label>Job status</Label>
                                <Select name="status" defaultValue={currentJob[0]?.status}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a job status"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            JOB_STATUS.options.map((status) => (
                                                <SelectItem
                                                    key={status}
                                                    value={status}>{status.slice(0, 1) + status.slice(1).toLowerCase()}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {serverErrors.job_status && (
                                    <p role="alert" className="text-sm text-destructive mt-1">{serverErrors.job_status}</p>
                                )}
                            </div>
                            <Button type="submit">Update</Button>
                        </form>
                    </div>
                </div>

                <div>
                    <div className="mb-2">
                        <h2>Customize pipeline</h2>
                        <p className="text-muted-foreground text-sm">Customize this job listing workflow</p>
                    </div>
                    {stages?.map((stage) => {
                        const stageRules = rulesForStage(stage.stage_name ?? "");
                        return (
                        <div key={stage.id} onClick={() => setOpenStage(stage.stage_name as JOB_ENUM)}>
                            <div className="flex items-center gap-4">
                                <span className={cn(stage.color, "w-4 h-4 rounded")}></span>
                                <p className="w-[150px]">{stage.stage_name}</p>
                            </div>

                            {openStage === stage.stage_name &&
                                <div className="w-full border p-4 flex flex-col gap-2">
                                    {stageRules.length > 0 ? (
                                        stageRules.map((rule) => (
                                            <div key={rule.id} className="flex items-center justify-between gap-2 text-sm">
                                                <span>{rule.name}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {ACTION_LABELS[rule.action.type]?.label ?? rule.action.type}
                                                    {rule.enabled ? "" : " (disabled)"}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No automations run when candidates reach this stage yet. Create one from the Pipelines tab.
                                        </p>
                                    )}
                                </div>
                            }
                        </div>
                        );
                    })}

                    <div className="flex justify-center mt-2">
                        <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
                            <DialogTrigger>
                             <span
                                 className="flex items-center gap-2 cursor-pointer text-blue-500 text-sm"
                             >
                                    <Plus size={18}/>
                                    <p>Add new stage</p>
                            </span>
                            </DialogTrigger>
                            <DialogContent>
                                <CreateNewStage jobId={job_id} stages={stages} onCreated={() => setStageDialogOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
            <div className="w-[40%] h-full border rounded p-4 flex flex-col gap-4">
                <div>
                    <h2>Job summary</h2>
                    <p className="text-muted-foreground text-sm">Live details for this job listing</p>
                </div>
                {currentJob[0] ? (
                    <dl className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className="font-medium">{currentJob[0].status}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Type</dt>
                            <dd className="font-medium">{formatJobTypeLabel(currentJob[0].type)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Location</dt>
                            <dd className="font-medium">{currentJob[0].location}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Department</dt>
                            <dd className="font-medium">{currentJob[0].department}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Salary</dt>
                            <dd className="font-medium">{formatSalaryRange(currentJob[0].salary_from, currentJob[0].salary)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Applicants</dt>
                            <dd className="font-medium">{currentJob[0].application_count}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-muted-foreground">Posted</dt>
                            <dd className="font-medium">{new Date(currentJob[0].created_at).toDateString()}</dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-sm text-muted-foreground">Job details could not be loaded.</p>
                )}
            </div>
        </div>
    );
};

export const CreateNewStage = ({ jobId, stages, onCreated }: { jobId: number; stages: StageResponseType[]; onCreated: () => void }) => {
    const [state, formAction] = useActionState(create_stage_action, initialState);

    useEffect(() => {
        if (state._success) onCreated();
    }, [state, onCreated]);

    // Only stages this job doesn't already have can be added — the server
    // dedupes as well, but there is no point offering a name that can only
    // fail. (The free-text "assign to" field is gone: it stored a raw
    // string against the users_table FK, and there is no member picker
    // here — the new stage is assigned to the user creating it.)
    const availableStages = JOB_STAGES.options.filter(
        (stage) => !stages.some((s) => s.stage_name === stage)
    );

    return (
        <div className="">
            <div>
                <DialogTitle>Add new stage</DialogTitle>
                <DialogDescription>Add a stage to this job&apos;s pipeline.</DialogDescription>
            </div>

            {availableStages.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">All available stages are already in this pipeline.</p>
            ) : (
            <form action={formAction} className="flex flex-col gap-4 mt-4">
                <input type="hidden" name="job_id" value={jobId} />
                {state._form && (
                    <p role="alert" className="text-sm text-destructive">{state._form}</p>
                )}
                <div>
                    <Label>Stage name</Label>
                    <Select name="stage_name">
                        <SelectTrigger className="">
                            <SelectValue placeholder="Select a stage name"/>
                        </SelectTrigger>
                        <SelectContent>
                            {availableStages.map(stage => (
                                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {state.stage_name && (
                        <p role="alert" className="text-sm text-destructive mt-1">{state.stage_name}</p>
                    )}
                </div>

                <div>
                    <Label>Color</Label>
                    <Input
                        type="color"
                        name="color"
                        defaultValue="#3B82F6"
                    />
                </div>

                <div>
                    <Button type="submit">Save</Button>
                </div>
            </form>
            )}
        </div>
    )
}

export default JobOptions;