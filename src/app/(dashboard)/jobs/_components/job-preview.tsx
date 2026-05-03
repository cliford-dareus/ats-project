'use client'

import React, {useState} from 'react';
import {useRouter} from "next/navigation";
import {JobResponseType} from "@/types";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {SheetClose} from "@/components/ui/sheet";
import {
    Briefcase,
    Calendar, Edit3,
    Expand,
    Share, Share2,
    Tally1, Users,
    X
} from "lucide-react";
import EditJobListingModal from '@/components/modal/edit-joblisting-modal';

type Props = {
    data: JobResponseType;
    jobs: JobResponseType[];
};

const JobPreview = ({data, jobs}: Props) => {
    const router = useRouter();
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);

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
                                router.push(`/jobs/${data?.id}`)
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

            <div className="px-4">
                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Header */}
                    <div className="bg-foreground rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                                    <Briefcase size={24} />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-accent text-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                        {data.status}
                                    </div>
                                    <div className="flex gap-2">
                                        <Edit3 size={16} className="text-white/40 cursor-pointer hover:text-white transition-colors" />
                                        <Share2 size={16} className="text-white/40 cursor-pointer hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold font-mono uppercase tracking-tight">{data.name}</h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{data.department}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Salary</p>
                                    <p className="text-sm font-bold font-mono">{data.salary}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Location</p>
                                    <p className="text-sm font-bold">{data.location}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Type</p>
                                    <p className="text-sm font-bold">Full-Time</p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                    <Users className="w-4 h-4"/>
                                    <span className="text-xs font-bold uppercase tracking-wider">Applicants</span>
                                </div>
                                <p className="text-xl font-bold text-zinc-900">{data?.candidatesCount}</p>
                            </div>
                            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                    <Calendar className="w-4 h-4"/>
                                    <span className="text-xs font-bold uppercase tracking-wider">Posted Date</span>
                                </div>
                                <p className="text-xl font-bold text-zinc-900">{new Date(data?.created_at).toDateString()}</p>
                            </div>
                        </div>

                        {/* Description Placeholder */}
                        <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <h4 className="text-sm font-bold text-zinc-900">Job Description</h4>
                            <div className="space-y-3">
                                <p className="text-sm text-zinc-600 leading-relaxed">
                                    We are lo
                                    oking for a talented {data?.name} to join our growing team in {data?.location}.
                                    As a key member of the {data?.department} department, you will be responsible for
                                    driving
                                    innovation
                                    and delivering high-quality solutions.
                                </p>
                                <ul className="space-y-2">
                                    {['Lead development of core features', 'Collaborate with cross-functional teams', 'Mentor junior engineers', 'Participate in code reviews'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"/>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <EditJobListingModal isEditJobOpen={isEditJobOpen} setIsEditJobOpen={setIsEditJobOpen} data={data}/>
        </>
    );
};

export default JobPreview;
