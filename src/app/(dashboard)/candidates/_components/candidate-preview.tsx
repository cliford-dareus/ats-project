"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CandidatesResponseType } from "@/types";
import {
    Briefcase,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Expand,
    Mail,
    Paperclip,
    Tally1,
    Users,
    X,
} from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import InternalNoteSection from "@/components/internal-note-section";

type Props = {
    data: CandidatesResponseType;
    candidates: CandidatesResponseType[];
};

const CandidatePreview = ({ data, candidates }: Props) => {
    const [currentCandidate, setCurrentCandidate] =
        useState<CandidatesResponseType | null>(null);
    // const [open, setOpen] = useState(false);
    // const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        setCurrentCandidate(
            candidates.find((candidate) => candidate.id === data.id) ?? null,
        );
    }, [data, candidates]);

    const nextApplication = () => {
        const currentIndex = candidates.findIndex(
            (app) => app.id === currentCandidate?.id,
        );
        if (currentIndex < candidates.length - 1) {
            setCurrentCandidate(candidates[currentIndex + 1]);
        }
    };

    const prevApplication = () => {
        const currentIndex = candidates.findIndex(
            (app) => app.id === currentCandidate?.id,
        );
        if (currentIndex > 0) {
            setCurrentCandidate(candidates[currentIndex - 1]);
        }
    };

    return (
        <>
            <div className="flex items-center p-4 border-b">
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
                            <span
                                onClick={() => {
                                    router.push(`/candidates/${currentCandidate?.id}`);
                                }}
                                className="flex items-center justify-center cursor-pointer"
                            >
                                <Expand size={16} />
                            </span>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex gap-2 items-center ml-auto">
                    <Button
                        onClick={() => prevApplication()}
                        className=""
                        variant="ghost"
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        onClick={() => nextApplication()}
                        className=""
                        variant="ghost"
                    >
                        <ChevronRight />
                    </Button>
                </div>
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
                            </div>
                        </div>


                        <div>
                            <h3 className="text-2xl font-bold font-mono uppercase tracking-tight">
                                {currentCandidate?.name}
                            </h3>
                            {/* No job title line: the list payload carries no
                                job title for the candidate, and the old
                                hardcoded "Software Engineer" was wrong for
                                every candidate. */}
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-background/10">
                            <div>
                                <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">
                                    Location
                                </p>
                                <p className="text-sm font-bold">
                                    {currentCandidate?.location || "—"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">
                                    Email
                                </p>
                                <p className="text-sm font-bold">{currentCandidate?.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">
                                    Phone
                                </p>
                                <p className="text-sm font-bold">{currentCandidate?.phone}</p>
                            </div>
                            {/* No Rating block: no rating column exists anywhere. */}
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                    </div>


                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                                    Active Applications
                                </span>
                            </div>
                            <p className="text-xl font-bold">
                                {currentCandidate?.applicationsCount}
                            </p>
                        </div>

                        <div className="bg-muted p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                                    Attachments
                                </span>
                            </div>
                            <p className="text-xl font-bold">
                                {currentCandidate?.attachmentsCount}
                            </p>
                        </div>
                    </div>

                    {/*Details List*/}
                    <div className="space-y-6 mb-6">
                        <div className="flex items-start gap-4 group">
                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                <Paperclip size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                    Attachments
                                </p>
                                {currentCandidate?.attachments?.length ? (
                                    <ul className="space-y-1 mt-1">
                                        {currentCandidate.attachments.map((attachment) => (
                                            <li key={attachment.id}>
                                                <a
                                                    href={`/api/attachments/${attachment.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                                >
                                                    {attachment.file_name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs font-bold text-foreground/30 mt-1">
                                        No attachments
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {currentCandidate?.email && (
                                    <a
                                        href={`mailto:${currentCandidate.email}`}
                                        className="p-2 hover:bg-primary/5 rounded-lg transition-colors text-foreground/30"
                                        aria-label={`Email ${currentCandidate.name}`}
                                    >
                                        <Mail size={16} />
                                    </a>
                                )}
                            </div>
                        </div>
                        {/* No CAN CONTACT rows: can_contact lives on
                            applications, not on the candidate list payload,
                            so the old triplicated always-checked rows were
                            invented data. */}
                    </div>

                    {/* Internal Notes & Comments */}
                    <InternalNoteSection
                        parent_type="candidate"
                        parent_id={currentCandidate?.id}
                        selectedId={currentCandidate?.id}
                        candidate_id={currentCandidate?.id}
                        entityType="candidate"
                    />
                </div>
            </div>
        </>
    );
};

export default CandidatePreview;
