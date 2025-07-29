'use client'

import React, {useState} from 'react';
import {useRouter} from "next/navigation";
import {JobResponseType, NoteResponseType} from "@/types";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {SheetClose} from "@/components/ui/sheet";
import {
    Briefcase,
    CalendarPlus2,
    ChevronDown,
    Dot,
    Expand, File, FileUser,
    MessageCircle,
    ScanEye,
    Share,
    Tally1,
    X
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import CreateNoteModal from "@/components/modal/create-note-modal";

type Props = {
    data: JobResponseType;
    jobs: JobResponseType[];
};

const JobPreview = ({data, jobs}: Props) => {
    const router = useRouter();
    const [notes, setNotes] = useState<NoteResponseType>({notes: [], total: 0});

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
                                router.push(`/jobs/${data.id}`)
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

            <div className="flex flex-col">
                <div className="p-4">
                    <div className='flex items-center gap-4'>
                        <div
                            className='flex items-center gap-2 border border-input bg-background rounded-md px-4 py-1 text-sm font-thin self-start text-muted-foreground'
                        >
                            <ScanEye size={16}/>
                            Job Preview
                        </div>

                        <span className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <CalendarPlus2 size={16}/>
                            Created on {new Date(data.created_at).toDateString()}
                        </span>
                    </div>

                    <div className='flex justify-between mt-4'>
                        <div className='flex flex-col'>
                            <span className='text-2xl font-medium text-gray-900'>{data.name}</span>
                            <Breadcrumb className=''>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <span className='text-sm text-muted-foreground'>{data.department}</span>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <Dot size={20}/>
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        <span className='text-sm text-muted-foreground'>{data.location}</span>
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
                                        {/*{filterStage.map((stage) => (*/}
                                        {/*    <DropdownMenuItem*/}
                                        {/*        onClick={async () => {*/}
                                        {/*            await update_application_stage_action({*/}
                                        {/*                applicationId: data.id,*/}
                                        {/*                new_stage_id: stage.id*/}
                                        {/*            })*/}
                                        {/*            // executeTrigger(data.id, stage.id, stage.stage_name as string)*/}
                                        {/*        }}*/}
                                        {/*        key={stage.id}*/}
                                        {/*    >*/}
                                        {/*        <p>{stage.stage_name}</p>*/}
                                        {/*        <div className="flex items-center gap-2">*/}
                                        {/*            {(JSON.parse(stage.trigger) as TriggerAction[]).map((trigger) => (*/}
                                        {/*                <span*/}
                                        {/*                    key={trigger.action_type}*/}
                                        {/*                    className="text-xs/3 flex items-center gap-2 text-slate-500"*/}
                                        {/*                >*/}
                                        {/*                    {trigger.action_type}*/}
                                        {/*                </span>*/}
                                        {/*            ))}*/}
                                        {/*        </div>*/}
                                        {/*    </DropdownMenuItem>*/}
                                        {/*))}*/}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className=""></div>
                </div>

                <div className="px-4">
                    <div className="border rounded-md p-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">Description</span>
                        </div>
                        <div className="mt-2">
                            <p>{data.description}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='px-4 flex flex-col gap-2 text-sm mt-4'>
                <div className='flex items-center gap-4 h-[30px]'>
                    <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                        <Briefcase size={18}/>
                        Other Applications
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        {/*{filterApplications && filterApplications.map((application: ApplicationResponseType, index) => (*/}
                        {/*    <div key={index} className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'>{application.job_apply}</div>*/}
                        {/*))}*/}
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
                {/*<div className='flex items-center gap-4 h-[30px]'>*/}
                {/*    <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>*/}
                {/*        <Paperclip size={18}/>*/}
                {/*        Attachments*/}
                {/*    </div>*/}
                {/*    <div className=''>*/}
                {/*        {attachments.length}*/}
                {/*    </div>*/}
                {/*</div>*/}

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
                                    // onClick={() => setOpen(true)}
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

export default JobPreview;
