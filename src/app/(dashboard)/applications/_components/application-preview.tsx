"use client";

import { ApplicationResponseType } from "@/types";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SheetClose } from "@/components/ui/sheet";
import {
    AlertCircle,
    Briefcase,
    Calendar,
    CheckCircle,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Expand,
    Mail,
    Phone,
    Tally1,
    UserCheck,
    Users,
    UserX,
    X,
    XCircle,
} from "lucide-react";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import InternalNoteSection from "@/components/internal-note-section";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JOB_STAGES } from "@/zod";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { get_stage_by_name_for_job_action } from "@/server/actions/stage_actions";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { useHasPermission } from "@/lib/use-permission";

const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

const REJECTION_ICONS = [AlertCircle, CheckCircle, Clock, XCircle];

type Props = {
    data: ApplicationResponseType;
    applications: ApplicationResponseType[];
};

const ApplicationPreview = ({ data, applications }: Props) => {
    const hasPermission = useHasPermission();
    const canMove = hasPermission("application:move");
    const canEditCandidate = hasPermission("candidate:edit");
    const [currentApplication, setCurrentApplication] =
        React.useState<ApplicationResponseType | null>(null);
    const router = useRouter();

    useEffect(() => {
        setCurrentApplication(
            applications.find((app) => app.id === data.id) || null,
        );
    }, [applications, data]);

    const nextApplication = () => {
        const currentIndex = applications.findIndex(
            (app) => app.id === currentApplication?.id,
        );
        if (currentIndex < applications.length - 1) {
            setCurrentApplication(applications[currentIndex + 1]);
        }
    };

    const prevApplication = () => {
        const currentIndex = applications.findIndex(
            (app) => app.id === currentApplication?.id,
        );
        if (currentIndex > 0) {
            setCurrentApplication(applications[currentIndex - 1]);
        }
    };

    // S-1: the stage is resolved job-scoped (by name within this
    // application's job) — the old code took stage[0] from the unscoped
    // name-only lookup, an arbitrary stage from any job/org.
    const moveToStage = async (stage_name: string) => {
        try {
            if (!currentApplication || !stage_name) return;

            const stage = await get_stage_by_name_for_job_action(
                stage_name,
                currentApplication.job_id,
            );
            if (!stage || typeof stage !== "object" || "error" in stage || !("id" in stage)) {
                alert("Stage not found");
                return;
            }
            const result = await update_application_stage_action({
                applicationId: currentApplication?.id,
                new_stage_id: stage.id as number,
            });
            if (result && typeof result === "object" && "error" in result && result.error) {
                alert((result as { message?: string }).message ?? "Failed to move the application");
                return;
            }
            router.refresh();
        } catch (error) {
            console.error(error);
        }
    };

    // B22-3: same reject path as the review page — candidate REJECTED plus
    // a NEGATIVE "Rejected: <reason>" note.
    const handleReject = async (reason: string) => {
        try {
            if (!currentApplication) return;
            const result = await update_candidate_action({
                id: currentApplication.candidate_id,
                status: "REJECTED",
            });
            if (result && typeof result === "object" && "error" in result && result.error) {
                alert((result as { message?: string }).message ?? "Failed to reject the candidate");
                return;
            }
            await create_note({
                text: `Rejected: ${reason}`,
                note_id: `candidate_${currentApplication.candidate_id}`,
                note_type: "candidate",
                candidate_id: currentApplication.candidate_id,
                type: "NEGATIVE",
                mentions: [],
            });
            router.refresh();
        } catch (error) {
            console.error(error);
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
                                    router.push(`/applications/${currentApplication?.id}`);
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
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-accent text-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                        {currentApplication?.status}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold font-mono uppercase tracking-tight">
                                    {currentApplication?.candidate_name}
                                </h3>
                                <p className="text-xs font-bold text-background/40 uppercase tracking-widest mt-1">
                                    Applying for{" "}
                                    <span className="uppercase text-primary">
                                        {currentApplication?.job_apply}
                                    </span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-background/10">
                                {/* L-4: the hardcoded rating {4.6} was removed —
                                    no rating exists for this application. */}
                                <div>
                                    <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">
                                        Location
                                    </p>
                                    <p className="text-sm font-bold">
                                        {currentApplication?.location}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-background/40 uppercase tracking-widest">
                                        Type
                                    </p>
                                    <p className="text-sm font-bold">{currentApplication?.type}</p>
                                </div>
                            </div>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-brand-dark uppercase tracking-widest">
                            QUICK ACTIONS
                        </h4>
                        <div className="flex gap-2">
                            {/* L-3: the dead "Advance Stage" button was removed —
                                the Advance dropdown next to it is the working one. */}
                            <div className="flex">
                                {canMove && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="px-4 py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-l-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                                            <UserCheck size={14} />
                                            Advance
                                            <ChevronDown size={14} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuRadioGroup
                                            value={currentApplication?.current_stage as string}
                                            onValueChange={moveToStage}
                                        >
                                            <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {JOB_STAGES.options.map((stage) => (
                                                <DropdownMenuRadioItem
                                                    value={stage}
                                                    key={stage}
                                                    className={cn(
                                                        "cursor-pointer",
                                                        currentApplication?.current_stage === stage
                                                            ? "bg-accent text-accent-foreground"
                                                            : "",
                                                    )}
                                                >
                                                    {stage}
                                                </DropdownMenuRadioItem>
                                            ))}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-r-lg uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-colors">
                                            <UserX size={14} />
                                            Reject
                                            <ChevronDown size={14} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {REJECTION_REASONS.map((reason, index) => {
                                            const Icon = REJECTION_ICONS[index];
                                            return (
                                                <DropdownMenuItem
                                                    key={reason}
                                                    disabled={!canEditCandidate}
                                                    onClick={() => handleReject(reason)}
                                                >
                                                    <Icon size={16} className="mr-2" />
                                                    {reason}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                                    Current Stage
                                </span>
                            </div>
                            <p className="text-xl font-bold">
                                {currentApplication?.current_stage}
                            </p>
                        </div>
                        <div className="bg-muted p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                                    Applied On
                                </span>
                            </div>
                            <p className="text-xl font-bold">
                                {new Date(
                                    currentApplication?.apply_date as Date,
                                ).toDateString()}
                            </p>
                        </div>
                    </div>

                    {/*Details List*/}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 group">
                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                <Mail size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                    EMAIL
                                </p>
                                <p className="text-xs font-bold">
                                    {currentApplication?.candidate_email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                <Phone size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                    PHONE NUMBER
                                </p>
                                <p className="text-xs font-bold">
                                    {currentApplication?.candidate_phone}
                                </p>
                            </div>
                        </div>

                        {/* L-5: the fake "ATTACHMENT / attachment.pdf" row was
                            removed — the preview payload (ApplicationResponseType)
                            carries no attachments, so no real link can be shown
                            here. The resume is reachable from the detail page
                            via /api/candidates/[id]/resume. */}

                        {/* L-6: renders the real can_contact value instead of
                            an unconditional checkmark; the Mail icon is a
                            real mailto: to the candidate's email. */}
                        <div className="flex items-center gap-4 group">
                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                {currentApplication?.can_contact ? (
                                    <CheckCircle2 size={16} />
                                ) : (
                                    <XCircle size={16} />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                    CAN CONTACT
                                </p>
                                <p className="text-xs font-bold mt-1">
                                    {currentApplication?.can_contact ? "Yes" : "No"}
                                </p>
                            </div>
                            {currentApplication?.candidate_email && (
                                <div className="flex gap-2">
                                    <a
                                        href={`mailto:${currentApplication.candidate_email}`}
                                        aria-label={`Email ${currentApplication.candidate_name}`}
                                        className="p-2 hover:bg-primary/5 rounded-lg transition-colors text-foreground/30"
                                    >
                                        <Mail size={16} />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Internal Notes & Comments */}
                    <InternalNoteSection
                        parent_type="application"
                        parent_id={currentApplication?.id}
                        selectedId={currentApplication?.id}
                        candidate_id={currentApplication?.candidate_id}
                    />
                </div>
            </div>
        </>
    );
};

export default ApplicationPreview;
