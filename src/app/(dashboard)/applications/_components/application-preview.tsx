"use client"

import React, {useEffect, useMemo, useRef} from 'react';
import {DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {ApplicationResponseType} from "@/types";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {CustomTabsTrigger, Tabs, TabsContent, TabsList} from "@/components/ui/tabs";
import {useRouter} from "next/navigation";
import {cn} from "@/lib/utils";
import {
    CalendarClock,
    ChevronDown,
    CircleUser,
    Expand,
    File,
    FileChartColumnIncreasing,
    Paperclip,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {useTriggers} from "@/providers/trigger-provider";
import {update_application_stage_action} from "@/server/actions/application_actions";
import {TriggerAction} from "@/plugins/smart-trigger/types";

type Props = {
    data: ApplicationResponseType;
    applications: ApplicationResponseType[];
};

const ApplicationPreview = ({data, applications}: Props) => {
    const {initializeTrigger, stages, executeTrigger, tasks} = useTriggers();
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const filterApplications = useMemo(() => {
        return applications.filter(application => application.candidate_name == data.candidate_name)
    }, [applications, data.candidate_name]);

    const filterStage = useMemo(() => {
        const currentStageIndex = stages.findIndex(stage => stage.stage_name === data.current_stage);
        return stages.slice(currentStageIndex + 1);
    }, [data, stages]);

    useEffect(() => {
        const isPreviewingApplication = filterApplications.every(app => app.candidate_name == data.candidate_name);
        if (!isPreviewingApplication) return;
        initializeTrigger(data.job_id);
    }, [data.job_id, initializeTrigger]);

    useEffect(() => {
        if (ref.current?.classList.contains('target')) {
            const target = ref.current;
            let sibling = target.previousElementSibling;

            while (sibling) {
                ((sibling.childNodes[0] as SVGElement).childNodes[0] as SVGPathElement).setAttribute("fill", "#f87171");
                sibling = sibling.previousSibling as HTMLDivElement;
            }
        }
    }, [data]);

    return (
        <>
            <div className="flex justify-between p-4">
                <div onClick={() => {
                    router.push(`/applications/${data.id}`);
                }}>
                    <Expand size={20}/>
                </div>
                <span>Export data</span>
            </div>
            <DrawerHeader className="px-0 border-b border-t p-4">
                <div className="flex justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-14 h-14">
                            <AvatarImage src="https://github.com/shadcn.png"/>
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <div className="">
                            <DrawerTitle className="text-xl font-bold">{data.candidate_name}</DrawerTitle>
                            <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                <FileChartColumnIncreasing size={16}/>
                                <span>Stage: <span className="text-blue-500">{data.current_stage}</span></span>
                            </p>
                            <p className="text-sm/5 flex items-center gap-2 text-slate-500">
                                <CircleUser size={16}/>
                                <span>Status: {data.candidate_status}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Contact</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuItem>Email</DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem>Call</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>Move to <ChevronDown size={16}/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                                <DropdownMenuLabel>Stages</DropdownMenuLabel>
                                <DropdownMenuSeparator/>
                                <DropdownMenuGroup>
                                    {filterStage.map((stage) => (
                                        <DropdownMenuItem
                                            onClick={async () => {
                                                await update_application_stage_action({
                                                    candidateId: data.id,
                                                    current_stage_id: stage.id
                                                })
                                                executeTrigger(data.id, stage.id, stage.stage_name as string)
                                            }}
                                            key={stage.id}
                                        >
                                            <p>{stage.stage_name}</p>
                                            <div className="flex items-center gap-2">
                                                {(JSON.parse(stage.trigger) as TriggerAction[]).map((trigger) => (
                                                <span
                                                    key={trigger.action_type}
                                                    className="text-xs/3 flex items-center gap-2 text-slate-500"
                                                >
                                                    {trigger.action_type}
                                                </span>
                                            ))}</div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </DrawerHeader>

            <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 w-[30%]">
                        <File size={16}/>
                        <p className="text-sm/3 flex items-center gap-2 text-slate-500">Applied on 1</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        {filterApplications && filterApplications.map((application: ApplicationResponseType, index) => (
                            <span
                                key={index}
                                className="flex items-center py-0.5 px-2 rounded bg-muted w-fit text-sm/3"
                            >
                                {application.job_apply}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 w-[30%]">
                        <CalendarClock size={16}/>
                        <p className="text-sm/3 flex items-center gap-2 text-slate-500">Years of Experience</p>
                    </div>
                    <span className="bg-muted text-sm/3 py-0.5">6</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex gap-4 w-[30%]">
                        <Paperclip size={16}/>
                        <p className="text-sm/3 text-slate-500">Attachment</p>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center p-2 rounded bg-muted w-36 h-12 text-sm">candidate attachment
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4">
                <Tabs defaultValue="summary" className="w-full py-2">
                    <div className="border-b">
                        <TabsList className="bg-transparent rounded-none p-0">
                            <CustomTabsTrigger className="px-8 flex items-center gap-4"
                                               value="summary">Summary</CustomTabsTrigger>
                            <CustomTabsTrigger className="px-4 flex items-center gap-4"
                                               value="notes">Interview</CustomTabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent className="" value="summary">
                        <p className="text-sm/3 flex items-center gap-2 mt-4">stages of:<span
                            className="text-blue-500">{data.job_apply}</span></p>

                        <div className="flex items-center gap-4 w-full mt-4">
                            <div className="w-full max-w-4xl mx-auto">
                                {/* Progress Bar Container */}
                                <div className="flex items-center justify-between">
                                    {/* Progress Steps */}
                                    <div
                                        className="flex w-full items-center overflow-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        {
                                            stages.map((stage) => (
                                                <div ref={ref} key={stage.id}
                                                     className={cn(data.current_stage == stage.stage_name ? "target" : "", "relative -ml-8 first:ml-0")}>
                                                    <svg
                                                        className="w-[200px] h-[50px]"
                                                        width="350" height="69" viewBox="0 0 305 69" fill="none"
                                                        xmlns="http://www.w3.org/2000/svg">
                                                        <path
                                                            d="M2.08643 0.5H248.992L303.992 34.5L248.992 68.5H2.08643L57.0937 34.5L2.08643 0.5Z"
                                                            stroke="white"
                                                            fill={data.current_stage !== stage.stage_name ? "#cbd5e1" : "#dc2626"}
                                                        />
                                                    </svg>
                                                    <p className="absolute top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2 text-white text-xs">{stage.stage_name}</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full flex flex-col border mt-4 rounded">
                            <div className="py-2 px-4 border-b ">
                                <h3>Details</h3>
                            </div>
                            <div className="my-4">
                                <div className="flex items-center gap-4 py-2 px-4 h-[40px]">
                                    <div className="w-[200px] flex gap-2 items-center">
                                        <span className="text-sm/3 text-slate-500">Current status</span>
                                        <Badge
                                            className="bg-green-100 text-green-500 font-normal shadow-none">{data.candidate_status}</Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm/3 text-slate-500">Assign To</span>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src="https://github.com/shadcn.png"/>
                                            </Avatar>
                                            <span className="text-sm">{data.assign_to}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-2 px-4 h-[40px]">
                                    <div className="w-[200px] flex gap-2 items-center">
                                        <span className="text-sm/3 text-slate-500">Stages</span>
                                        <p className="text-sm text-blue-500">{data.current_stage}</p>
                                    </div>

                                    <div className="w-[200px] flex items-center gap-2">
                                        <span className="text-sm/3 text-slate-500">Owner</span>
                                        <p className="text-sm">{data.candidate_status}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 py-2 px-4 h-[40px]">
                                    <div className="w-[200px] flex gap-2">
                                        <span className="text-sm/3 text-slate-500">Applied Date</span>
                                        <p className="text-sm">{data.candidate_id}</p>
                                    </div>

                                    {/*<div className="">*/}
                                    {/*    <Button>Move to Next stage</Button>*/}
                                    {/*</div>*/}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="notes">
                        <div className="w-full flex flex-col border mt-4 rounded">
                            <div className="py-2 px-4 border-b ">
                                <h3>Notes</h3>
                            </div>
                            <div className="flex py-2 px-4">
                                <Button>Add Note</Button>
                            </div>
                            <div className="flex flex-col gap-4 py-2 px-4">
                                {tasks.map((task) => (
                                    <div key={task?.name} className="flex items-center gap-4">
                                        <div className="w-[200px] flex gap-2 items-center">
                                            <span className="text-sm/3 text-slate-500">Task Title</span>
                                            <p className="text-sm">{task?.type}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm/3 text-slate-500">Due Date</span>
                                            {/*<p className="text-sm">{task?.triggerTime.toLocaleDateString()}</p>*/}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default ApplicationPreview;