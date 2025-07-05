import React, { useState } from 'react';
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {CandidatesResponseType} from "@/types";
import {Bot, Briefcase, CalendarPlus2, Dot, Expand,File,FileText,Mail, MessageCircle, Share, Tally1, X} from "lucide-react";
import {SheetClose} from "@/components/ui/sheet";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import { Badge } from '@/components/ui/badge';

type Props = {
    data: CandidatesResponseType;
    candidates: CandidatesResponseType[];
};

const CandidatePreview = ({data, candidates}: Props) => {
    const [open, setOpen] = useState<boolean>(false)
    const router = useRouter();

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

            <div className='p-4'>
                <div className='flex flex-col gap-2'>
                    <div className='border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start'>
                        Canditate Preview
                    </div>
                    <span className='flex items-center gap-4 text-sm text-muted-foreground'>
                        <CalendarPlus2 size={16}/>
                        Created on {new Date(data.created_at).toDateString()}
                    </span>
                </div>
                <div className='flex justify-between mt-2'>
                    <div className='flex flex-col'>
                        <span className='text-2xl font-medium text-gray-900'>{data.name}</span>
                        <Breadcrumb className=''>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                     <span className='text-sm text-muted-foreground'>Profession</span>
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
                        <Button variant="outline" className=''>
                            <MessageCircle size={16}/>
                            <span>Send Message</span>
                        </Button>
                        <Button variant="outline" className=''>
                            <Mail size={16}/>
                            <span>Send email</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className='p-4 flex flex-col gap-2 h-[250px]'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Bot size={18}/>
                    Ai Resume Summary
                </div>
                <div className='h-full border rounded-md p-4 text-muted-foreground'>
                    <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptatem et quidem exercitationem a, vel consequatur maxime! Esse porro fugiat minus officiis quisquam voluptatem suscipit, eos error omnis, ea nemo, incidunt corrupti laboriosam ad! Exercitationem eius soluta, impedit quisquam doloribus et dolore dolorem, labore eveniet voluptatibus asperiores est explicabo tempora ipsum?</p>
                </div>
                {/* <div className='flex items-center gap-4 h-[30px]'>
                    <div className='flex gap-4 items-center w-[200px] text-muted-foreground'>
                        <Briefcase size={18}/>
                        Sourced from
                    </div>
                    <div className=''>Linkedin</div>
                </div>
                 <div className='flex items-center gap-4 h-[30px]'>
                    <div className='flex gap-4 items-center w-[200px] text-muted-foreground'>
                        <Briefcase size={18}/>
                        Sourced from
                    </div>
                    <div className=''>Linkedin</div>
                </div>
                 <div className='flex items-center gap-4 h-[30px]'>
                    <div className='flex gap-2 items-center w-[200px] text-muted-foreground'>
                        <Briefcase size={18}/>
                        Applications
                    </div>
                    <div className=''>

                    </div>
                </div> */}
            </div>

            <div className='p-4 h-[100px]'>
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <FileText size={18}/>
                    Candidate File
                </div>
                <div className='border rounded-md h-full mt-2'>
                    <div className='flex items-center gap-4 h-full p-4'>
                        <div className='flex items-center justify-center rounded-md bg-purple-500 w-[40px] h-full'>
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
