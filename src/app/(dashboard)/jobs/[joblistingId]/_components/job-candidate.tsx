"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {
    AlertCircle,
    Briefcase,
    Calendar, CheckCircle2, Download, ExternalLink, FileText, History,
    LucideEllipsis, LucideMail, Mail,
    MessageSquare,
    Sparkles, Star, TrendingUp
} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {ApplicationType, JobExperienceType, JobListingType} from "@/types";
import React, {useEffect, useState} from "react";
import {cn, getApplicationMatch} from "@/lib/utils";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import { get_candidate_details } from "@/server/queries/mongo/candidate-details";
import ApplicationSummary, { ApplicationSummaryType, MatchResult } from "@/app/(dashboard)/applications/[applicationId]/_components/application-summary";
import JobQuickViewCard from "@/components/job-quick-view-card";

type Props = {
    job: JobListingType;
};

const JobCandidate = ({job}: Props) => {
    const applications = job.applications as unknown as ApplicationType[];
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [selectedApplications, setSelectedApplications] = useState<ApplicationType>();
    const [applicationSummary, setApplicationSummary] = useState<ApplicationSummaryType>({
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

    useEffect(() => {
        const detailsFn = async () => {
            const rawResponse = await get_candidate_details(selectedApplications?.candidate.id as number);
            const candidateDetails = JSON.parse(rawResponse);
            setApplicationSummary(candidateDetails);
        };

        detailsFn();
    }, [selectedApplications, job]);

    useEffect(() => {
        setSelectedApplications(applications[0]);
    }, [applications]);

    return (
        <div>
            <div className="flex gap-8 h-full overflow-scroll">
                <Tabs defaultValue="all">
                    <div className="w-full">
                        <TabsList className="bg-transparent rounded-none p-0 h-auto">
                            <div className="flex items-center py-4 w-full">
                                <Select defaultValue="all">
                                    <SelectTrigger className="w-full max-w-48">
                                        <SelectValue placeholder="Select a status"/>
                                    </SelectTrigger>
                                    <SelectContent>
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
                            </div>
                        </TabsList>
                    </div>

                    {/* All Applied */}
                    <TabsContent value="all">
                        <div className="rounded h-full">
                            <div className="h-[40px] flex items-center gap-4">
                                <Checkbox className="text-zinc-400" onCheckedChange={() => handleSelectAll()} id="all"/>
                                <Label htmlFor="all">Select All</Label>
                            </div>

                            <div className="">
                                {applications.map((application) => (
                                    <div
                                        key={application.id}
                                        onClick={() => setSelectedApplications(application)}
                                        className={cn("flex items-center justify-between px-4  py-2 cursor-pointer border rounded-md mt-1",
                                            selectedApplications?.id == application.id ? "bg-zinc-100" : ""
                                        )}
                                    >
                                        <div className="flex gap-4 items-center">
                                            <Checkbox
                                                className="text-zinc-400"
                                                checked={selectedCandidates.includes(application.id)}
                                                onCheckedChange={() => handleSelectCandidate(application.id)}
                                                id={String(application.id)}
                                            />
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src="https://github.com/shadcn.png"/>
                                                <AvatarFallback>CN</AvatarFallback>
                                            </Avatar>
                                            <span>{application.candidate.name}</span>
                                        </div>
                                        <span className="ml-4">
                                            <LucideMail size={16} className="text-zinc-400"/>
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
                                        <LucideEllipsis/>
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
                        <div className="mt-4">
                            <div className="">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src="https://github.com/shadcn.png"/>
                                                <AvatarFallback>CN</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="text-2xl font-bold text-zinc-900">{selectedApplications.candidate.name.toUpperCase()}</h2>
                                                <p className="text-sm text-zinc-500 font-medium">
                                                    Applying for <span
                                                    className="text-blue-600 font-bold uppercase">{job.job_name}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4"/>
                                            Message
                                        </button>
                                        <Button
                                            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-brand-500/20">
                                            Advance Stage
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-2">
                                    {/* Left Column: Candidate & Job Info */}
                                   <ApplicationSummary
                                        applicationSummary={applicationSummary}
                                        candidate_id={selectedApplications.candidate.id}
                                        jobSkills={job.job_technologies as unknown as JobExperienceType[]}
                                    />

                                    {/* Right Column: Sidebar Info */}
                                    <div className="space-y-4">
                                        {/* Application Details */}
                                        <div
                                            className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-4">
                                            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-zinc-400"/>
                                                Application Details
                                            </h3>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                        <Calendar className="w-4 h-4 text-zinc-500"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Applied
                                                            On</p>
                                                        <p className="text-sm font-semibold text-zinc-900">{new Date(selectedApplications.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                        <Star className="w-4 h-4 text-zinc-500"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Internal
                                                            Rating</p>
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-sm font-semibold text-zinc-900">4.5</p>
                                                            <Star className="w-3 h-3 text-amber-500 fill-current"/>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                        <History className="w-4 h-4 text-zinc-500"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Current
                                                            Stage</p>
                                                        <span
                                                            className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-100 uppercase tracking-wider">
                    {selectedApplications.stage}
                  </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-zinc-100">
                                                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3">Contact
                                                    Info</h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                        <Mail className="w-4 h-4 text-zinc-400"/>
                                                        {selectedApplications.candidate.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                        <ExternalLink className="w-4 h-4 text-zinc-400"/>
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobCandidate;
