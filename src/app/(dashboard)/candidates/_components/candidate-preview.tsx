"use client";

import React, {useEffect, useState} from 'react';
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {CandidatesResponseType} from "@/types";
import {Bot, Briefcase, CalendarPlus2, Dot, Expand, File, FileText, FileUser, Mail, MessageCircle, Paperclip, ScanEye, Share, Tally1, X} from "lucide-react";
import {SheetClose} from "@/components/ui/sheet";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {Badge} from '@/components/ui/badge';
import {get_candidate_attachments} from "@/server/queries/mongo/attachment";

type Props = {
    data: CandidatesResponseType;
    candidates: CandidatesResponseType[];
};

const CandidatePreview = ({data, candidates}: Props) => {
    const [open, setOpen] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [generatedSummary, setGeneratedSummary] = useState<string>("");
    const router = useRouter();

    const generateFn = async () => {
        setIsPreviewing(true);
        try {
            const response = await fetch("/api/resume/summary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({file: data.cv_path}),
            });

            if (!response.ok){
                throw new Error(response.statusText);
            };

            const datas = await response.json();
            setGeneratedSummary(datas.result);
        } catch (error) {
            console.log(error);
        } finally {
            setIsPreviewing(false);
        }
    };

    useEffect(() => {
        const fetchAttachments = async () => {
            const attachments = await get_candidate_attachments(data.id);
            setAttachments(JSON.parse(attachments));
        };
        fetchAttachments();
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

            <div className='flex flex-col border-b'>
                <div className='p-4'>
                    <div className='flex items-center gap-4'>
                        <div
                            className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'
                        >
                            <ScanEye size={16}/>
                            Canditate Preview
                        </div>

                        <span className='flex items-center gap-4 text-sm text-muted-foreground'>
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
                                        <span className='text-sm text-muted-foreground'>Sofware Developer</span>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <Dot size={20}/>
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        <Badge
                                            className='font-thin self-start'
                                            variant={data.status == "Active"? "active" : data.status == "Hired"? "outline" : "default"}
                                        >
                                            {data.status}
                                        </Badge>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <div className='flex items-center gap-4 self-start'>
                            <Button variant="outline" className='text-sm'>
                                <MessageCircle size={16}/>
                                <span>Send Message</span>
                            </Button>
                            <Button variant="outline" className='text-sm'>
                                <Mail size={16}/>
                                <span>Send email</span>
                            </Button>
                        </div>
                    </div>

                    <div className='border rounded-md p-4 mt-2'>
                        <span className='text-sm text-muted-foreground'>Email: {data.email}</span>
                    </div>
                </div>

                <div className='px-4 flex flex-col gap-2 text-sm'>
                    <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-4 items-center w-[200px] text-muted-foreground'>
                            <Briefcase size={18}/>
                            Sourced from
                        </div>
                        <div className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'>Linkedin</div>
                    </div>
                    <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-4 items-center w-[200px] text-muted-foreground'>
                            <FileUser size={18}/>
                            Applications
                        </div>
                        <div className=''>{data.applicationsCount}</div>
                    </div>
                    <div className='flex items-center gap-4 h-[30px]'>
                        <div className='flex gap-4 items-center w-[200px] text-muted-foreground'>
                            <Paperclip size={18}/>
                            Attachments
                        </div>
                        <div className=''>
                            {attachments.length}
                        </div>
                    </div>
                </div>

                <div className='p-4'>
                    <div className='flex items-center justify-between text-sm text-muted-foreground'>
                        <div className='flex items-center gap-2'>
                            <FileText size={18}/>
                            Candidate File
                        </div>

                        <Button className='flex items-center gap-2' onClick={generateFn}>
                            <ScanEye size={18}/>
                            <span className='flex items-center gap-2'>
                                {isPreviewing ? "Generating..." : "Generate Summary"}
                            </span>
                        </Button>
                    </div>


                    <div className='border rounded-md mt-4 h-[80px]'>
                        <div className='flex items-center gap-4 h-full p-4'>
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
            </div>

            {generatedSummary && <div className='p-4 flex flex-col gap-2 h-[250px] mt-4'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Bot size={18}/>
                    AI Resume Summary
                </div>
                <div className='h-full border rounded-md p-4 text-muted-foreground'>
                    <p>{generatedSummary}</p>
                </div>
            </div>}

            <div className='p-4 mt-4'>
                <div className='flex items-center justify-between text-sm text-muted-foreground'>
                    <div className='flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground'>
                        <CalendarPlus2 size={18}/>
                        Notes
                    </div>
                    <span className='text-purple-500 cursor-pointer font-semibold'>See All</span>
                </div>
                <div className='h-full border rounded-md p-4 text-muted-foreground mt-4'>
                    <p>No notes yet</p>
                </div>
            </div>

            {open &&
                <div className='p-4 mt-4'>
                    <object
                        data={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.cv_path}`}      type="application/pdf" width="100%" height="300px">
                        <p>Alternative text - include a link <a href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.cv_path}`}>to the PDF!</a></p>
                    </object>
                </div>}
        </>
    );
};

export default CandidatePreview;
