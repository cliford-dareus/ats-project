'use client'

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { JobResponseType } from "@/types";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SheetClose } from "@/components/ui/sheet";
import {
    Briefcase,
    Calendar, Edit3,
    Expand,
    Share, Share2,
    Tally1, Users,
    X
} from "lucide-react";
import EditJobListingModal from '@/components/modal/edit-joblisting-modal';
import { formatSalaryRange } from "@/lib/format-salary-range";
import { copyTextToClipboard, formatJobTypeLabel } from "@/lib/job-display";
import { get_job_career_url_action } from "@/app/(dashboard)/jobs/[joblistingId]/_actions/job-options-actions";

type Props = {
    data: JobResponseType;
    jobs: JobResponseType[];
};

const JobPreview = ({ data }: Props) => {
    const router = useRouter();
    const [isEditJobOpen, setIsEditJobOpen] = useState(false);
    const [shareNotice, setShareNotice] = useState<string | null>(null);

    // The preview row carries no subdomain, so the public apply link is
    // built server-side from the job row (org-scoped) and copied here.
    const handleShare = async () => {
        const result = await get_job_career_url_action(data.id);
        if (!result.success) {
            setShareNotice("Couldn't build the share link.");
        } else {
            const ok = await copyTextToClipboard(result.url);
            setShareNotice(ok ? "Link copied." : "Copy failed — copy the link from your career page.");
        }
        window.setTimeout(() => setShareNotice(null), 2500);
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border-b">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <SheetClose className="flex items-center justify-center cursor-pointer">
                                <X size={20} />
                            </SheetClose>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                            <Tally1 />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            <span onClick={() => {
                                router.push(`/jobs/${data?.id}`)
                            }} className="flex items-center justify-center cursor-pointer">
                                <Expand size={16} />
                            </span>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <span className='flex items-center justify-center gap-2 text-sm text-muted-foreground sm:gap-2.5'>
                    {shareNotice && <span role="status" className="text-xs">{shareNotice}</span>}
                    <button type="button" onClick={handleShare} title="Copy public job link" aria-label="Copy public job link" className="cursor-pointer hover:text-foreground transition-colors">
                        <Share size={16} />
                    </button>
                </span>
            </div>

            <div className="px-4">
                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Header */}
                    <div className="bg-foreground text-background relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 bg-card/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                                    <Briefcase size={24} />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-accent text-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                        {data.status}
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsEditJobOpen(true)} title="Edit job" aria-label="Edit job">
                                            <Edit3 size={16} className="text-background/40 cursor-pointer hover:text-background transition-colors" />
                                        </button>
                                        <button type="button" onClick={handleShare} title="Copy public job link" aria-label="Copy public job link">
                                            <Share2 size={16} className="text-background/40 cursor-pointer hover:text-background transition-colors" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold font-mono uppercase tracking-tight">{data.name}</h3>
                                <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest mt-1">{data.department}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-background/10">
                                <div>
                                    <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">Salary</p>
                                    <p className="text-sm font-bold font-mono">{formatSalaryRange(data.salary_from, data.salary)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">Location</p>
                                    <p className="text-sm font-bold">{data.location}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">Type</p>
                                    <p className="text-sm font-bold">{formatJobTypeLabel(data.type)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted p-4 rounded-2xl border border-border">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Applicants</span>
                                </div>
                                <p className="text-xl font-bold text-foreground">{data.application_count}</p>
                            </div>
                            <div className="bg-muted p-4 rounded-2xl border border-border">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Posted Date</span>
                                </div>
                                <p className="text-xl font-bold text-foreground">{new Date(data?.created_at).toDateString()}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-bold text-foreground">Job Description</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {data.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <EditJobListingModal isEditJobOpen={isEditJobOpen} setIsEditJobOpen={setIsEditJobOpen} data={data} />
        </>
    );
};

export default JobPreview;
