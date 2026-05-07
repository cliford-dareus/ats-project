"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    ChevronDown,
    Clock,
    Linkedin,
    LucideEllipsis,
    LucideMail,
    Mail,
    MessageSquare,
    Star,
    UserCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ApplicationType,
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
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import {
    ApplicationExperienceMatch,
    ApplicationSummaryType,
    EmptyApplicationSummary,
} from "@/app/(dashboard)/applications/[applicationId]/_components/application-summary";
import JobQuickViewCard from "@/components/job-quick-view-card";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { Button } from "@/components/ui/button";

type Props = {
    job: JobListingType;
    stages: StageResponseType[];
};

const JobCandidate = ({ job, stages }: Props) => {
    const applications = job.applications as unknown as ApplicationType[];
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [selectedApplications, setSelectedApplications] =
        useState<ApplicationType>();
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

    useEffect(() => {
        const detailsFn = async () => {
            const rawResponse = await get_candidate_details(
                selectedApplications?.candidate.id as number,
            );
            const candidateDetails = JSON.parse(rawResponse);
            setApplicationSummary(candidateDetails);
        };

        detailsFn();
    }, [selectedApplications, job]);

    useEffect(() => {
        setSelectedApplications(applications[0]);
    }, [applications]);

    return (
        <>
            <div className="flex gap-4 h-full">
                <Tabs defaultValue="all">
                    <div className="flex mt-4 items-center justify-between bg-white border border-foreground/5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <TabsList className="bg-transparent rounded-none  outline-none p-0 h-auto w-full">
                            <Select defaultValue="all">
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent className="outline-none border-none bg-transparent">
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            <TabsTrigger value="all">All Applied</TabsTrigger>
                                        </SelectItem>
                                        <SelectItem value="drafted">
                                            <TabsTrigger value="drafted">All Drafted</TabsTrigger>
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </TabsList>
                    </div>

                    {/* All Applied */}
                    <TabsContent value="all">
                        <div className="bg-white rounded-2xl border border-foreground/5 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-foreground/5 flex items-center gap-3">
                                <Checkbox
                                    className="text-zinc-400"
                                    onCheckedChange={() => handleSelectAll()}
                                    id="all"
                                />
                                <Label htmlFor="all">Select All</Label>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {applications.map((application) => (
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
                                            className="text-zinc-400"
                                            checked={selectedCandidates.includes(application.id)}
                                            onCheckedChange={() =>
                                                handleSelectCandidate(application.id)
                                            }
                                            id={String(application.id)}
                                        />
                                        <Avatar className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                            <AvatarImage src="https://github.com/shadcn.png" />
                                            <AvatarFallback>CN</AvatarFallback>
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
                                            <LucideMail
                                                size={16}
                                                className="text-foreground/20 group-hover:text-primary transition-colors"
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="drafted">
                        <div className="rounded h-full">
                            <div className="flex items-center justify-between py-4">
                                <div>
                                    <h2 className="text-lg">All Drafted</h2>
                                    <p className="text-sm text-slate-400">
                                        All Drafted candidates are listed here.
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <LucideEllipsis />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>Option 1</DropdownMenuItem>
                                        <DropdownMenuItem>Option 2</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                                <AvatarImage src="https://github.com/shadcn.png" />
                                                <AvatarFallback>CN</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">
                                                    {selectedApplications.candidate.name.toUpperCase()}
                                                </h2>
                                                <p className="text-sm text-zinc-500 font-medium">
                                                    Applying for{" "}
                                                    <span className="text-primary font-bold uppercase">
                                                        {job.job_name}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="px-4 !py-0 border border-zinc-200 rounded-lg text-[10px] uppercase tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                                            <MessageSquare size={14} />
                                        </Button>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="px-4 py-2 bg-primary text-white text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
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
                                    </div>
                                </div>

                                {!applicationSummary.experience ||
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
                                <div className="bg-white p-6 rounded-3xl border border-brand-dark/5 shadow-sm space-y-8">
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
                                                <Star size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                                    Internal Rating
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <p className="text-xs font-bold">4.5</p>
                                                    <Star
                                                        size={10}
                                                        className="text-orange-400 fill-orange-400"
                                                    />
                                                </div>
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
                                            <div className="flex items-center gap-2 text-xs font-bold text-brand-dark/60 cursor-pointer hover:text-brand-primary transition-colors">
                                                <Linkedin
                                                    size={14}
                                                    className="text-foreground/30 group-hover:text-primary transition-colors"
                                                />
                                                LinkedIn Profile
                                            </div>
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
