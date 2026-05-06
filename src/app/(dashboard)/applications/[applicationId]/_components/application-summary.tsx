"use client";

import { Button } from "@/components/ui/button";
import { cn, getApplicationMatch } from "@/lib/utils";
import { create_application_summary, generate_missing_fields } from "@/server/actions/resume-actions";
import { CandidateEducation, CandidateExperience, JobExperienceType } from "@/types";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileText,
    Sparkles,
    TrendingUp,
} from "lucide-react";
import { useState } from "react";

export interface ApplicationSummaryType {
    candidate_id: number;
    resumeSummary: string;
    skills: string[];
    experience: CandidateExperience[];
    education: CandidateEducation[];
}

export interface MatchResult {
    name: string;
    candidateYears: number;
    requiredYears: number;
    match: boolean;
}

type ApplicationSummaryProps = {
    candidate_id: number;
    resumeSummary: string;
    key_accomplishments: string[];
};

export const ApplicationSummary = ({ candidate_id, resumeSummary, key_accomplishments }: ApplicationSummaryProps) => {
    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-[11px] font-bold text-brand-dark uppercase tracking-widest">
                        Resume Summary
                    </h3>
                </div>
                <button className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:underline">
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                </button>
            </div>
            <div className="p-4">
                <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                    <div className="flex gap-2 group">
                        <div className="min-w-4 h-full pt-1">
                            <GenerateFieldButton field_name="resumeSummary" candidate_id={candidate_id} />
                        </div>
                        <p>{resumeSummary}</p>
                    </div>
                    <h4 className="text-zinc-900 font-bold mt-4 mb-2">
                        Key Accomplishments:
                    </h4>
                    <div className="flex gap-2 group">
                        <div className="min-w-4 h-full pt-2">
                            <GenerateFieldButton field_name="key_accomplishments" candidate_id={candidate_id} />
                        </div>
                        <ul className="list-disc pl-5 space-y-1">
                            {key_accomplishments.map((accomplishment, index) => (
                                <li key={index} className="truncate-ellipsis ">{accomplishment}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ApplicationExperience = ({ experience, }: { experience: CandidateExperience[] }) => {
    return (
        <div>
            <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">
                Experience
            </h4>
            <div className="space-y-6">
                {experience?.map((experience, index) => (
                    <div key={index} className="flex gap-4">
                        <div className="w-10 h-10 bg-zinc-100 rounded-lg flex-shrink-0" />
                        <div>
                            <p className="font-bold text-zinc-900">{experience.position}</p>
                            <p className="text-sm text-zinc-500">
                                {experience.company} • {experience.period}
                            </p>
                            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                                {experience.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ApplicationEducation = ({ education }: { education: CandidateEducation[] }) => {
    return (
        <div>
            {education.map((edu, index) => (
                <div key={index}>
                    <p className="font-bold text-zinc-900">{edu.school}</p>
                    <p className="text-sm text-zinc-500">{edu.degree}</p>
                    <p className="text-sm text-zinc-500">{edu.field_of_study}</p>
                    <p className="text-sm text-zinc-500">{edu.graduation_date}</p>
                </div>
            ))}
        </div>
    );
};

type ApplicationExperienceMatchProps = {
    candidate_id: number;
    experience: CandidateExperience[];
    jobSkills: JobExperienceType[];
};

export const ApplicationExperienceMatch = ({ candidate_id, experience, jobSkills }: ApplicationExperienceMatchProps) => {
    const experienceMatch = getApplicationMatch(candidate_id, jobSkills, experience);

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h3 className="text-[11px] font-bold text-brand-dark uppercase tracking-widest">
                        Experience Match Analysis
                    </h3>
                </div>
                <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">
                        {experienceMatch?.score}% Match
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                    {experienceMatch?.skills.map((skill, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100"
                        >
                            <div>
                                <p className="text-sm font-bold text-zinc-900">{skill.name}</p>
                                <p className="text-xs text-zinc-500">
                                    {skill.candidateYears} years exp.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-400">
                                    Req:{skill.requiredYears}
                                </span>
                                {skill.match ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const EmptyApplicationSummary = ({ candidate_id }: { candidate_id: number }) => {
    const [loading, setLoading] = useState(false);
    
    const analyzeCandidate = async (candidate_id: number) => {
        try {
            setLoading(true);
            const summary = await create_application_summary(candidate_id);
            if (!summary.success) {
                console.log(summary.error);
            }
        } catch (error) {
            console.log(error);
            return JSON.stringify([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="col-span-2 space-y-4">
            {/* CandidateDetails Comparison Card */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h3 className="text-[11px] font-bold text-brand-dark uppercase tracking-widest">
                            Experience Match Analysis
                        </h3>
                    </div>
                    <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">0% Match</span>
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                        <p></p>
                    </div>
                </div>
            </div>

            {/* Resume Preview / Summary */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4">
                    <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                        <section>
                            <h4 className="text-sm font-bold  uppercase tracking-widest mb-4 text-foreground/40 ">
                                AI Talent Analysis
                            </h4>
                            <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-12 h-12 text-brand-600" />
                                </div>

                                <div className="text-center py-8">
                                    <p className="text-zinc-600 mb-4">
                                        Get a deep dive into your candidate&rsquo;s profile using Gemini
                                        AI.
                                    </p>
                                    <Button
                                        onClick={() => analyzeCandidate(candidate_id)}
                                        className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Generate Analysis
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const GenerateFieldButton = ({ candidate_id, field_name }: { candidate_id: number; field_name: string }) => {
    const [loading, setLoading] = useState(false);
    
    const handleClick = async () => {
        try {
            setLoading(true);
            await generate_missing_fields(candidate_id, [field_name]);
        } catch (error) {
            alert(error?.message || 'Failed to generate field');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            onClick={() => handleClick()}
            className={cn("hidden px-0.5 !py-0 font-semibold hover:text-primary hover:bg-transparent group-hover:flex items-start transition-all", loading && "flex")}
            disabled={loading}
        >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
    );
};
