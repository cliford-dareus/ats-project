'use client'

import React, {useState} from 'react';
import {useRouter} from "next/navigation";
import {JobResponseType, NoteResponseType} from "@/types";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {SheetClose} from "@/components/ui/sheet";
import {
    Briefcase, Building2, Calendar,
    CalendarPlus2,
    ChevronDown, Clock,
    Dot, Edit3,
    Expand, File, FileUser, MapPin,
    MessageCircle,
    ScanEye,
    Share, Share2,
    Tally1, Users,
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
import {newDate} from "date-fns-jalali";

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

            <div className="p-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Building2 className="text-white w-5 h-5"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">Job Preview</h3>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Internal View</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Title & Status */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider bg-green-300">
                                {data.status}
                              </span>
                            <div className="flex items-center gap-2">
                                <button
                                    className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all">
                                    <Edit3 className="w-4 h-4"/>
                                </button>
                                <button
                                    className="p-2 text-zinc-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all">
                                    <Share2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{data.name}</h2>
                        <p className="text-zinc-500 mt-1 font-medium">{data.department}</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <Users className="w-4 h-4"/>
                                <span className="text-xs font-bold uppercase tracking-wider">Applicants</span>
                            </div>
                            <p className="text-xl font-bold text-zinc-900">{data.candidatesCount}</p>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <Calendar className="w-4 h-4"/>
                                <span className="text-xs font-bold uppercase tracking-wider">Posted Date</span>
                            </div>
                            <p className="text-xl font-bold text-zinc-900">{new Date(data.created_at).toDateString()}</p>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-zinc-600">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <MapPin className="w-4 h-4"/>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Location</p>
                                <p className="text-sm font-semibold">{data.location}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-600">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4"/>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Type</p>
                                <p className="text-sm font-semibold">Full-Time</p>
                            </div>
                        </div>
                    </div>

                    {/* Description Placeholder */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                        <h4 className="text-sm font-bold text-zinc-900">Job Description</h4>
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-600 leading-relaxed">
                                We are lo
                                oking for a talented {data.name} to join our growing team in {data.location}.
                                As a key member of the {data.department} department, you will be responsible for driving
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
        </>
    );
};

export default JobPreview;
