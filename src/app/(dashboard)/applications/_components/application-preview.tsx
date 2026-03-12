"use client";

import {ApplicationResponseType, NoteType} from "@/types";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator} from "@/components/ui/breadcrumb";
import {SheetClose} from "@/components/ui/sheet";
import {
    Building2,
    Calendar, CheckCircle, CheckCircle2,
    Edit3,
    Expand, Mail, Phone,
    Share,
    Share2, Star,
    Tally1,
    Users, View,
    X
} from "lucide-react";
import React from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import InternalNoteSection from "@/components/internal-note-section";

type Props = {
    data: ApplicationResponseType;
    applications: ApplicationResponseType[];
    noteData: {notes: NoteType[]}
};

const ApplicationPreview = ({data, noteData}: Props) => {
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
                                router.push(`/applications/${data.id}`)
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
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                    <Building2 className="text-white w-5 h-5"/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900">Application Preview</h3>
                                    <p className="text-xs text-zinc-500 tracking-wider">Internal
                                        View</p>
                                </div>
                            </div>
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
                    </div>

                    {/* Info Card */}
                    <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                        <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider bg-green-300"
                        >
                                {data.status}
                        </span>
                        <div>
                            <p className="text-2xl font-bold  leading-tight uppercase">{data.candidate_name}</p>
                            <div className="flex text-zinc-400 text-sm gap-4">
                                <span className="font-medium">Applying for <span
                                    className="uppercase text-blue-500">{data.job_apply}</span></span>
                            </div>
                        </div>
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Location</span>
                                <span className="font-medium">{data.location}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Type</span>
                                <span className="font-medium ">Full Time</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Rating</span>
                                <span className="flex items-center gap-1">
                                    <p className="text-sm font-semibold">{4.6}</p>
                                    <Star className="w-3 h-3 text-amber-500 fill-current"/>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="uppercase font-medium">Quick Actions</span>
                        <div className="flex items-center justify-between gap-3">
                            <Button variant="ghost" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20">
                                Advance Stage
                            </Button>
                            <Button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20">
                                Schedule Interview
                            </Button>
                            <Button variant="outline" className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-red-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                                {/*<MessageSquare className="w-4 h-4" />*/}
                                Reject Application
                            </Button>
                        </div>
                    </div>


                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <Users className="w-4 h-4"/>
                                <span className="text-xs font-bold uppercase tracking-wider">Current Stage</span>
                            </div>
                            <p className="text-xl font-bold text-zinc-900">{data.current_stage}</p>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <Calendar className="w-4 h-4"/>
                                <span className="text-xs font-bold uppercase tracking-wider">Applied On</span>
                            </div>
                            <p className="text-xl font-bold text-zinc-900">{new Date(data.apply_date).toDateString()}</p>
                        </div>
                    </div>

                    {/*Details List*/}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-zinc-600">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <Mail className="w-4 h-4"/>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Email</p>
                                <p className="text-sm font-semibold">{data.candidate_email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-600">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4"/>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Phone Number</p>
                                <p className="text-sm font-semibold">{data.candidate_phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-600">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4"/>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Attachment</p>
                                <p className="text-sm font-semibold text-blue-500">resume_v1.pdf</p>
                            </div>
                            <div className="ml-auto">
                                <Button variant="outline" className="text-sm  tracking-wider">
                                    <View />
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <Star className="w-4 h-4 text-zinc-500"/>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Can
                                    Contact</p>
                                <div >
                                    {data.can_contact ? <CheckCircle2 className="w-4 h-4"/> :
                                        <CheckCircle className="w-4 h-4"/>}
                                    {/*<p className="text-sm font-semibold text-zinc-900">candidate</p>*/}
                                </div>
                            </div>
                                <div className="ml-auto">
                                    <Button variant="outline" className="text-sm  tracking-wider">
                                        <Mail  />
                                    </Button>
                                </div>
                        </div>
                    </div>

                    {/* Internal Notes & Comments */}
                    <InternalNoteSection data={noteData} parent_type="application" parent_id={data.id} />
                </div>
            </div>
        </>
    );
};

export default ApplicationPreview;
