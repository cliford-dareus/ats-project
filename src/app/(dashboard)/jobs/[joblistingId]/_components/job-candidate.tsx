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
import {ApplicationType, JobListing} from "@/types";
import React, {useEffect, useState} from "react";
import {cn} from "@/lib/utils";
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

type Props = {
    job: JobListing;
};

const JobCandidate = ({job}: Props) => {
    const applications = job.applications as unknown as ApplicationType[];
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [selectedApplications, setSelectedApplications] = useState<ApplicationType>();
    const [experience, setExperience] = useState<{
        score: number,
        skills: { name: string, year: number, required: number, match: boolean }[],
        summary: string
    }>();

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
        const candidateId = selectedApplications?.candidate.id;
        // const getExperience = async () => {
        //     const experience = await get_candiate_experience(candidateId as number);
        //     setExperience(JSON.parse(experience));
        // };
        // getExperience();
        const candidateExp = [{id: 1, name: "React", year: 5}, {id: 2, name: "Python", year: 8}];

        const countMap = new Map();
        candidateExp.forEach(item => countMap.set(item.name, item.year));

        const matches = [] as { name: string, year: number, required: number, match: boolean }[];
        job.job_technologies.forEach(item => {
            if (countMap.has(item.name) && countMap.get(item.name) >= item.years_experience) {
                const match = {
                    name: item.name,
                    year: countMap.get(item.name) ? countMap.get(item.name) : 0,
                    required: item.years_experience,
                    match: true
                };
                matches.push(match);
            } else {
                const match = {
                    name: item.name,
                    year: countMap.get(item.name) ? countMap.get(item.name) : 0,
                    required: item.years_experience,
                    match: false
                };
                matches.push(match);
            }
        });

        const experienceMatch = {
            score: 85,
            skills: matches,
            summary: "Alex has strong frontend fundamentals and exceeds the required experience in React and TypeScript. The only gap is in GraphQL, where they have 1 year of experience compared to our preferred 2 years."
        };

        setExperience(experienceMatch)
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
                                    <div className="col-span-2 space-y-4">
                                        {/* CandidateDetails Comparison Card */}
                                        <div
                                            className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                            <div
                                                className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-blue-600"/>
                                                    <h3 className="font-bold text-zinc-900">Experience Match
                                                        Analysis</h3>
                                                </div>
                                                <div
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-blue-700 rounded-full border border-blue-100">
                                                    <Sparkles className="w-3.5 h-3.5"/>
                                                    <span
                                                        className="text-xs font-bold">{experience?.score}% Match</span>
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div className="grid grid-cols-2 gap-6">
                                                    {experience?.skills.map((skill, index) => (
                                                        <div key={index}
                                                             className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                                            <div>
                                                                <p className="text-sm font-bold text-zinc-900">{skill.name}</p>
                                                                <p className="text-xs text-zinc-500">{skill.year} years
                                                                    exp.</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-xs font-medium text-zinc-400">Req:{skill.required}</span>
                                                                {skill.match ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500"/>
                                                                ) : (
                                                                    <AlertCircle className="w-5 h-5 text-amber-500"/>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resume Preview / Summary */}
                                        <div
                                            className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                            <div
                                                className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-zinc-400"/>
                                                    <h3 className="font-bold text-zinc-900">Resume Summary</h3>
                                                </div>
                                                <button
                                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                    <Download className="w-3.5 h-3.5"/>
                                                    Download PDF
                                                </button>
                                            </div>
                                            <div className="p-4">
                                                <div
                                                    className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                                                    <p>
                                                        Experienced software engineer with a strong background in
                                                        building scalable web applications.
                                                        Expertise in React, Node.js, and cloud infrastructure. Proven
                                                        track record of leading technical teams
                                                        and delivering complex projects on time.
                                                    </p>
                                                    <h4 className="text-zinc-900 font-bold mt-4 mb-2">Key
                                                        Accomplishments:</h4>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        <li>Reduced application load time by 40% through code
                                                            optimization.
                                                        </li>
                                                        <li>Implemented automated testing suite increasing coverage to
                                                            85%.
                                                        </li>
                                                        <li>Led a team of 5 developers in a complete system migration.
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

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
                                        <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-brand-400"/>
                                                <h3 className="font-bold text-sm uppercase tracking-wider">Job
                                                    Overview</h3>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold leading-tight">{job.job_name}</p>
                                                <p className="text-zinc-400 text-sm">{job.job_department}</p>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-500">Location</span>
                                                    <span className="font-medium">{job.job_department}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-500">Type</span>
                                                    <span className="font-medium">Full-Time</span>
                                                </div>
                                            </div>
                                        </div>
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
