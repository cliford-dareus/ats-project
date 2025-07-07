"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button} from "@/components/ui/button";
import {ApplicationResponseType, NoteResponseType} from "@/types";
import {Badge} from "@/components/ui/badge";
import {useRouter} from "next/navigation";
import {cn} from "@/lib/utils";
import {
    Briefcase,
    CalendarPlus2,
    ChevronDown,
    Dot,
    Expand,
    File,
    FileUser,
    MessageCircle,
    Paperclip,
    ScanEye,
    Share,
    Tally1,
    X,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {SheetClose} from "@/components/ui/sheet";
import {useTriggers} from "@/providers/trigger-provider";
import {update_application_stage_action} from "@/server/actions/application_actions";
import {TriggerAction} from "@/plugins/smart-trigger/types";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {get_application_notes} from "@/server/queries/mongo/note";
import {Dialog, DialogTitle} from "@/components/ui/dialog";
import CreateNoteModal from "@/components/modal/create-note-modal";
import {DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Skeleton} from "@/components/ui/skeleton";

type Props = {
    data: ApplicationResponseType;
    applications: ApplicationResponseType[];
};

const ApplicationPreview = ({data, applications}: Props) => {
    const {initializeTrigger, stages, executeTrigger, tasks} = useTriggers();
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState<NoteResponseType>({notes: [], total: 0});
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
        const fetchNotes = async () => {
            const notes = await get_application_notes({parent_id: `app_${data.id}`, limit: 1, offset: 0});
            const parsedNotes = JSON.parse(notes as string) as NoteResponseType;
            setNotes(parsedNotes);
        };
        fetchNotes();
    }, [data.id]);

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
            <div className="flex items-center justify-between p-4 border-b">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <SheetClose className="flex items-center justify-center cursor-pointer">
                                <X size={20}/>
                            </SheetClose>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <Tally1/>
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <span onClick={() => {
                                router.push(`/candidates/${data.id}`)
                            }} className="flex items-center justify-center cursor-pointer">
                                <Expand size={16}/>
                            </span>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <span className='flex items-center justify-center text-sm text-muted-foreground sm:gap-2.5'>
                    <Share size={16}/>
                </span>
            </div>

            <div className="flex flex-col border-b">
                <div className="p-4">
                    <div className='flex items-center gap-4'>
                        <div
                            className='flex items-center gap-2 border border-input bg-background rounded-md px-4 py-1 text-sm font-thin self-start text-muted-foreground'
                        >
                            <ScanEye size={16}/>
                            Application Preview
                        </div>

                        <span className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <CalendarPlus2 size={16}/>
                            Created on {new Date(data.created_at).toDateString()}
                        </span>
                    </div>

                    <div className='flex justify-between mt-4'>
                        <div className='flex flex-col'>
                            <span className='text-2xl font-medium text-gray-900'>{data.candidate_name}</span>
                            <Breadcrumb className=''>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <span className='text-sm text-muted-foreground'>{data.job_apply}</span>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <Dot size={20}/>
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        <span className='text-sm text-muted-foreground'>{data.current_stage}</span>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <Dot size={20}/>
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        <Badge
                                            className='font-thin self-start'
                                            variant={data.candidate_status == "Active"? "active" : data.candidate_status == "Hired"? "outline" : "default"}
                                        >
                                            {data.candidate_status}
                                        </Badge>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className='flex items-center gap-4 self-start'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className='text-sm'>
                                        <MessageCircle size={16}/>
                                        <span>Action</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuItem>Email</DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem>Call</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className='text-sm'>
                                        <span>Move</span>
                                        <ChevronDown size={16}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Stages</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuGroup>
                                        {filterStage.map((stage) => (
                                            <DropdownMenuItem
                                                onClick={async () => {
                                                    await update_application_stage_action({
                                                        applicationId: data.id,
                                                        new_stage_id: stage.id
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
                                                    ))}
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* This compomemt render slowly investigate why */}
                <div className='p-4'>
                    <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                        <CalendarPlus2 size={16}/>
                        Pipeline
                    </div>
                    <div className='border rounded-md p-4 mt-2 h-[74px]'>
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-full max-w-3xl mx-auto">
                                {/* Progress Bar Container */}
                                <div className="flex items-center justify-between h-[40px]">
                                    {/* Progress Steps */}
                                    <div
                                        className="flex w-full items-center overflow-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] h-[40px]">
                                        {
                                            stages.map((stage) => (
                                                <div ref={ref} key={stage.id}
                                                     className={cn(data.current_stage == stage.stage_name ? "target" : "", "relative -ml-14 first:ml-0")}>
                                                        <svg
                                                            className="w-[170px] h-[40px]"
                                                            width="170" height="69" viewBox="0 0 305 69" fill="none"
                                                            xmlns="http://www.w3.org/2000.svg">
                                                            <path
                                                                d="M2.08643 0.5H248.992L303.992 34.5L248.992 68.5H2.08643L57.0937 34.5L2.08643 0.5Z"
                                                                stroke="white"
                                                                fill={data.current_stage !== stage.stage_name ? "#cbd5e1" : "purple"}
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
                        </div>
                    </div>
            </div>

            <div className='px-4 flex flex-col gap-2 text-sm'>
                <div className='flex items-center gap-4 h-[30px]'>
                    <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                        <Briefcase size={18}/>
                        Other Applications
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        {filterApplications && filterApplications.map((application: ApplicationResponseType, index) => (
                            <div key={index} className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'>{application.job_apply}</div>
                        ))}
                    </div>
                </div>
                <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                            <Briefcase size={18}/>
                            Applied on
                        </div>
                        <div className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'>Linkedin</div>
                </div>
                <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                            <FileUser size={18}/>
                            Years of Experience
                        </div>
                        <div className=''>1</div>
                </div>
                <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                            <Paperclip size={18}/>
                            Attachments
                        </div>
                        <div className=''>
                            5
                        </div>
                </div>

                <div className='border rounded-md mt-4 h-[80px]'>
                        <div className='flex items-center gap-2 h-full p-4'>
                            <div className='flex items-center justify-center rounded-md bg-purple-500 w-[50px] h-full'>
                                <File size={18} color='white'/>
                            </div>
                            <div className='flex flex-col text-sm'>
                                <span className=''>Resume-file.pdf</span>
                                <div className='flex gap-2'>
                                    <span className='text-muted-foreground'>12MB</span>
                                    <span><Dot size={18}/></span>
                                    <span
                                        className='text-purple-500 cursor-pointer'
                                        onClick={() => setOpen(true)}
                                    >
                                        Preview
                                    </span>
                                </div>
                            </div>
                        </div>
                </div>
            </div>

            <div className='p-4 mt-4'>
                <div className='flex items-center justify-between text-sm text-muted-foreground'>
                    <div className='flex items-center gap-2 border border-input bg-background rounded-md px-4 py-1 text-sm font-thin self-start text-muted-foreground'>
                        <CalendarPlus2 size={18}/>
                        Notes({notes?.total})
                    </div>
                    <span className='text-purple-500 cursor-pointer font-semibold'>See All</span>
                </div>

                {notes?.notes.length > 0 ?
                <div className='h-full border rounded-md text-muted-foreground mt-4 text-sm'>
                    {notes?.notes.map((note) => (
                        <div key={note._id}>
                            <div className='flex justify-between items-center gap-4 p-4 border-b'>
                                <span className='font-medium text-black'>{note.user.name}</span>
                                <span>{new Date(note.created_at).toDateString()}</span>
                            </div>
                            <div className='p-4 h-[100px]'>
                                <p>{note.content}</p>
                            </div>
                        </div>
                    ))}
                </div> :
                <div className='h-full border rounded-md text-muted-foreground mt-4 text-sm'>
                        <div>
                            <div className='h-[53px] flex justify-between items-center gap-4 p-4 border-b'></div>
                            <Skeleton className='p-4 h-[100px]'>
                                <p>No notes yet</p>
                            </Skeleton>
                        </div>
                </div>}

                <Dialog>
                    <DialogTrigger asChild>
                        <Button >Add Note</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Add Note</DialogTitle>
                        <CreateNoteModal prefix="app" parent_id={data.id} parent_type="application"/>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default ApplicationPreview;
