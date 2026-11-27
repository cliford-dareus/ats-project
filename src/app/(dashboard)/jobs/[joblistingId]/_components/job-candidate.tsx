"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    ExternalLink,
    Linkedin,
    LucideMail,
    Mail,
    MessageSquare,
    UserCheck,
    UserX,
    XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ApplicationType,
    CandidateType,
    JobExperienceType,
    JobListingType,
    StageResponseType,
} from "@/types";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ApplicationExperienceMatch,
    ApplicationSummaryType,
    EmptyApplicationSummary,
} from "@/app/(dashboard)/applications/[applicationId]/_components/application-summary";
import JobQuickViewCard from "@/components/job-quick-view-card";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { useHasPermission } from "@/lib/use-permission";
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import { useRouter } from "next/navigation";

type Props = {
    job: JobListingType;
    stages: StageResponseType[];
};

// The Drizzle candidate row carries linkedin_url, but CandidateType does not
// declare it — narrow the access to this file instead of widening the
// shared type.
type CandidateWithLinks = CandidateType & {
    linkedin_url?: string | null;
};

/** Initials derived from the candidate's real name (B20-7, B22-4). */
const getInitials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("") || "?";

const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

const REJECTION_ICONS = [AlertCircle, CheckCircle, Clock, XCircle];

const JobCandidate = ({ job, stages }: Props) => {
    const router = useRouter();
    const hasPermission = useHasPermission();
    const canMove = hasPermission("application:move");
    const canEditCandidate = hasPermission("candidate:edit");
    const applications = job.applications as unknown as ApplicationType[];
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [selectedApplications, setSelectedApplications] = useState<ApplicationType>();
    const [isBulkBusy, setIsBulkBusy] = useState(false);
    const [applicationSummary, setApplicationSummary] =
        useState<ApplicationSummaryType>({
            candidate_id: 0,
            resumeSummary: "",
            skills: [],
            experience: [],
            education: [],
        });

    const handleSelectAll = () => {
        if (selectedCandidates.length === applications.length) {
            setSelectedCandidates([]);
        } else {
            setSelectedCandidates(applications.map((application) => application.id));
        }
    };

    const handleSelectCandidate = (id: number) => {
        if (selectedCandidates.includes(id)) {
            setSelectedCandidates(
                selectedCandidates.filter((candidateId) => candidateId !== id),
            );
        } else {
            setSelectedCandidates([...selectedCandidates, id]);
        }
    };

    const moveToStage = async (newStageName: string) => {
        if (!selectedApplications) return;

        const targetStage = stages.find(
            (stage) => stage.stage_name === newStageName,
        );

        if (!targetStage) {
            console.error("Target stage not found:", newStageName);
            return;
        }

        try {
            await update_application_stage_action({
                applicationId: selectedApplications.id,
                new_stage_id: targetStage.id,
            });
            // The cache will be revalidated by the action, but you might want to
            // trigger a client-side re-fetch or state update here if the change
            // needs to be immediately reflected without a full page reload.
        } catch (error) {
            console.error("Failed to move application to new stage:", error);
        }
    };

    // B20-1: the selection finally has consumers — bulk stage-move and bulk
    // reject (same reject path as the review page: candidate REJECTED +
    // NEGATIVE "Rejected: <reason>" note).
    const bulkMoveToStage = async (newStageName: string) => {
        const targetStage = stages.find((stage) => stage.stage_name === newStageName);
        if (!targetStage || selectedCandidates.length === 0) return;
        setIsBulkBusy(true);
        try {
            for (const applicationId of selectedCandidates) {
                await update_application_stage_action({
                    applicationId,
                    new_stage_id: targetStage.id,
                });
            }
            setSelectedCandidates([]);
            router.refresh();
        } catch (error) {
            console.error("Failed to bulk-move applications:", error);
        } finally {
            setIsBulkBusy(false);
        }
    };

    const bulkReject = async (reason: string) => {
        if (selectedCandidates.length === 0) return;
        setIsBulkBusy(true);
        try {
            for (const applicationId of selectedCandidates) {
                const application = applications.find((app) => app.id === applicationId);
                if (!application) continue;
                await update_candidate_action({
                    id: application.candidate.id,
                    status: "REJECTED",
                });
                await create_note({
                    text: `Rejected: ${reason}`,
                    note_id: `candidate_${application.candidate.id}`,
                    note_type: "candidate",
                    candidate_id: application.candidate.id,
                    type: "NEGATIVE",
                    mentions: [],
                });
            }
            setSelectedCandidates([]);
            router.refresh();
        } catch (error) {
            console.error("Failed to bulk-reject applications:", error);
        } finally {
            setIsBulkBusy(false);
        }
    };

    useEffect(() => {
        const detailsFn = async () => {
            if (!selectedApplications?.candidate?.id) return;
            const rawResponse = await get_candidate_details(
                selectedApplications.candidate.id as number,
            );
            const candidateDetails = JSON.parse(rawResponse);
            setApplicationSummary(candidateDetails);
        };

        detailsFn();
    }, [selectedApplications, job]);

    useEffect(() => {
        setSelectedApplications(applications[0]);
    }, [applications]);

    const renderApplicationRow = (application: ApplicationType) => (
        <div
            key={application.id}
            onClick={() => setSelectedApplications(application)}
            className={cn(
                "p-4 flex items-center gap-3 cursor-pointer transition-all group border-b border-foreground/5 last:border-0",
                selectedApplications?.id === application.id
                    ? "bg-primary/5"
                    : "hover:bg-background/50",
            )}
        >
            <Checkbox
                className="text-muted-foreground"
                checked={selectedCandidates.includes(application.id)}
                onCheckedChange={() =>
                    handleSelectCandidate(application.id)
                }
                id={String(application.id)}
            />
            <Avatar className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm">
                <AvatarFallback>{getInitials(application.candidate.name)}</AvatarFallback>
            </Avatar>
            <span
                className={cn(
                    "text-xs font-bold transition-colors flex-1 truncate",
                    selectedApplications?.id === application.id
                        ? "text-primary"
                        : "text-foreground/60 group-hover:text-primary",
                )}
            >
                {application.candidate.name}
            </span>

            <span className="ml-4">
                <a
                    href={`mailto:${application.candidate.email}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Email ${application.candidate.name}`}
                >
                    <LucideMail
                        size={16}
                        className="text-foreground/20 group-hover:text-primary transition-colors"
                    />
                </a>
            </span>
        </div>
    );

    // B20-1: bulk-action bar for the selection.
    const bulkBar = selectedCandidates.length > 0 && (
        <div className="p-3 mb-3 bg-card rounded-2xl border border-foreground/5 shadow-sm flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">
                {selectedCandidates.length} selected
            </span>
            {canMove && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            disabled={isBulkBusy}
                            className="px-3 py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                        >
                            <UserCheck size={14} />
                            Move to stage
                            <ChevronDown size={14} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuRadioGroup onValueChange={bulkMoveToStage}>
                            {stages.map((stage) => (
                                <DropdownMenuRadioItem
                                    value={stage.stage_name!}
                                    key={stage.id}
                                    className="cursor-pointer"
                                >
                                    {stage.stage_name}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {canEditCandidate && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            disabled={isBulkBusy}
                            className="px-3 py-2 bg-red-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            <UserX size={14} />
                            Reject
                            <ChevronDown size={14} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {REJECTION_REASONS.map((reason, index) => {
                            const Icon = REJECTION_ICONS[index];
                            return (
                                <DropdownMenuItem key={reason} onClick={() => bulkReject(reason)}>
                                    <Icon size={16} className="mr-2" />
                                    {reason}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <button
                onClick={() => setSelectedCandidates([])}
                className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground"
            >
                Clear
            </button>
        </div>
    );

    // B20-2 / B20-5: tabs are "All Applications" (every application for this
    // job — the old "All Applied" label implied a stage filter that did not
    // exist) and "Drafted" (only stage "Drafted" applications).
    const draftedApplications = applications.filter(
        (application) => application.stage === "Drafted",
    );

    return (
        <>
            <div className="flex gap-4 h-full">
                <Tabs defaultValue="all">
                    <div className="flex mt-4 items-center justify-between bg-card border border-foreground/5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <TabsList className="bg-transparent rounded-none  outline-none p-0 h-auto w-full">
                            <Select defaultValue="all">
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent className="outline-none border-none bg-transparent">
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            <TabsTrigger value="all">All Applications</TabsTrigger>
                                        </SelectItem>
                                        <SelectItem value="drafted">
                                            <TabsTrigger value="drafted">All Drafted</TabsTrigger>
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </TabsList>
                    </div>

                    {/* All Applications */}
                    <TabsContent value="all">
                        {bulkBar}
                        <div className="bg-card rounded-2xl border border-foreground/5 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-foreground/5 flex items-center gap-3">
                                <Checkbox
                                    className="text-muted-foreground"
                                    onCheckedChange={() => handleSelectAll()}
                                    id="all"
                                />
                                <Label htmlFor="all">Select All</Label>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {applications.map((application) => renderApplicationRow(application))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="drafted">
                        {bulkBar}
                        <div className="bg-card rounded-2xl border border-foreground/5 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-foreground/5">
                                <h2 className="text-lg">All Drafted</h2>
                                <p className="text-sm text-muted-foreground">
                                    All Drafted candidates are listed here.
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {draftedApplications.length > 0 ? (
                                    draftedApplications.map((application) =>
                                        renderApplicationRow(application),
                                    )
                                ) : (
                                    <p className="p-4 text-sm text-muted-foreground">
                                        No drafted applications for this job yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Right side */}
                <div className="flex-1">
                    {selectedApplications && (
                        <div className="mt-4 flex-1 flex">
                            {/* Left Column: Candidate & Job Info */}
                            <div className="flex-1 overflow-y-auto space-y-8 pr-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarFallback>
                                                    {getInitials(selectedApplications.candidate.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    {selectedApplications.candidate.name.toUpperCase()}
                                                </h2>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    Applying for{" "}
                                                    <span className="text-primary font-bold uppercase">
                                                        {job.job_name}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href={`mailto:${selectedApplications.candidate.email}`}
                                            aria-label={`Message ${selectedApplications.candidate.name}`}
                                            className="px-4 !py-2 border border-border rounded-lg text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2"
                                        >
                                            <MessageSquare size={14} />
                                        </a>

                                        {canMove && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="px-4 py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                                                    <UserCheck size={14} />
                                                    Advance
                                                    <ChevronDown size={14} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuRadioGroup
                                                    value={selectedApplications?.stage as string}
                                                    onValueChange={moveToStage}
                                                >
                                                    {stages.map((stage) => (
                                                        <DropdownMenuRadioItem
                                                            value={stage.stage_name!}
                                                            key={stage.id}
                                                            className={cn(
                                                                "cursor-pointer",
                                                                selectedApplications?.stage === stage.stage_name
                                                                    ? "bg-accent text-accent-foreground"
                                                                    : "",
                                                            )}
                                                        >
                                                            {stage.stage_name}
                                                        </DropdownMenuRadioItem>
                                                    ))}
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        )}
                                    </div>
                                </div>

                                {
                                    !applicationSummary.experience ||
                                    !applicationSummary.skills ||
                                    !applicationSummary.education ||
                                    !applicationSummary.resumeSummary ? (
                                    <div className="col-span-2 space-y-4">
                                        <EmptyApplicationSummary
                                            candidate_id={selectedApplications.candidate.id}
                                        />
                                    </div>
                                ) : (
                                    <div className="col-span-2 space-y-4">
                                            <ApplicationExperienceMatch
                                                resume_score_fit={selectedApplications.resume_score_fit}
                                                candidate_id={selectedApplications.candidate.id}
                                                experience={applicationSummary.experience}
                                                jobSkills={
                                                    job.job_technologies as unknown as JobExperienceType[]
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Sidebar Info */}
                            <div className="space-y-4 w-80">
                                {/* Application Details */}
                                <div className="bg-card p-6 rounded-3xl border border-brand-dark/5 shadow-sm space-y-8">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={16} className="text-brand-dark/30" />
                                        <h3 className="text-[11px] font-bold text-brand-dark uppercase tracking-widest">
                                            Application Details
                                        </h3>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                                <Calendar size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                                    Applied on
                                                </p>
                                                <p className="text-xs font-bold">
                                                    {new Date(
                                                        selectedApplications.created_at,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                                    Current Stage
                                                </p>
                                                <span
                                                    className={cn(
                                                        "text-[9px] font-bold px-4 py-1 border rounded-full uppercase tracking-widest",
                                                    )}
                                                >
                                                    {selectedApplications.stage}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-brand-dark/5 space-y-4">
                                        <h4 className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">
                                            Contact Info
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-brand-dark/60">
                                                <Mail
                                                    size={14}
                                                    className="text-foreground/30 group-hover:text-primary transition-colors"
                                                />
                                                {selectedApplications.candidate.email}
                                            </div>
                                            {(selectedApplications.candidate as CandidateWithLinks).linkedin_url && (
                                                <a
                                                    href={(selectedApplications.candidate as CandidateWithLinks).linkedin_url!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-xs font-bold text-brand-dark/60 cursor-pointer hover:text-brand-primary transition-colors"
                                                >
                                                    <Linkedin
                                                        size={14}
                                                        className="text-foreground/30 group-hover:text-primary transition-colors"
                                                    />
                                                    LinkedIn Profile
                                                    <ExternalLink size={12} className="text-foreground/30" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Job Details Quick View */}
                                <JobQuickViewCard
                                    name={job.job_name}
                                    department={job.job_department}
                                    location={job.job_location}
                                    type={job.job_type}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default JobCandidate;
