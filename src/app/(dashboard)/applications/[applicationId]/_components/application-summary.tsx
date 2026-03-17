"use client";

import { Button } from "@/components/ui/button";
import { create_application_summary } from "@/server/actions/resume-actions";
import { CandidateExperience, Experience } from "@/types";
import { AlertCircle, CheckCircle2, Download, FileText, Sparkles, TrendingUp } from "lucide-react";

type Props = {
    applicationSummary: {
        candidate_id: number;
        resumeSummary: string;
        skills: string[];
        experience: CandidateExperience[];
        education: string[];
    };
    candidate_id: number;
    jobSkills: Experience[];
};

const ApplicationSummary = ({ applicationSummary, candidate_id, jobSkills }: Props) => {
    const { resumeSummary, experience, education, skills } = applicationSummary;

    const getApplicationMatch = (candidate_id: number, jobSkills: Experience[]) => {
        const countMap = new Map();
        skills?.forEach(item => countMap.set(item, (countMap.get(item) || 0) + 1));

        const matches = [] as { name: string; year: any; required: number | null; match: boolean; }[];
        jobSkills?.forEach(item => {
            if (countMap.has(item.name) && countMap.get(item.name) >= item.years_experience!) {
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
        };
        return experienceMatch;
    };

    const analyzeCandidate = async (candidate_id: number) => {
        try {
            const summary = await create_application_summary(candidate_id);
            if (!summary.success) {
                console.log(summary.error);
            }
        } catch (error) {
            console.log(error);
            return JSON.stringify([]);
        }
    };

    const experienceMatch = getApplicationMatch(candidate_id, jobSkills);

    if (!resumeSummary || !experience || !education || !skills) {
        return (
            <div className="col-span-2 space-y-4">
                {/* CandidateDetails Comparison Card */}
                <div
                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                    <div
                        className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <h3 className="font-bold text-zinc-900">Experience Match Analysis</h3>
                        </div>
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-blue-700 rounded-full border border-blue-100">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span
                                className="text-xs font-bold">0% Match</span>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                            <p></p>
                        </div>
                    </div>
                </div>

                {/* Resume Preview / Summary */}
                <div
                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                    <div className="p-4">
                        <div
                            className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                            <section>
                                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">AI Talent Analysis</h4>
                                <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles className="w-12 h-12 text-brand-600" />
                                    </div>


                                    <div className="text-center py-8">
                                        <p className="text-zinc-600 mb-4">Get a deep dive into your candidate's profile using Gemini AI.</p>
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
        )
    };

    return (
        <div className="col-span-2 space-y-4">
            {/* CandidateDetails Comparison Card */}
            <div
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
            >
                <div
                    className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-zinc-900">Experience Match Analysis</h3>
                    </div>
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-blue-700 rounded-full border border-blue-100">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span
                            className="text-xs font-bold">90% Match</span>
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                        {experienceMatch?.skills.map((skill, index) => (
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
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
            >
                <div
                    className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400" />
                        <h3 className="font-bold text-zinc-900">Resume Summary</h3>
                    </div>
                    <button
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
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

            <div>
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Experience</h4>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-zinc-100 rounded-lg flex-shrink-0" />
                        <div>
                            <p className="font-bold text-zinc-900">Senior Software Engineer</p>
                            <p className="text-sm text-zinc-500">TechCorp Inc. • 2021 - Present</p>
                            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                                Leading the frontend team in developing high-performance React applications.
                                Implemented micro-frontend architecture reducing build times by 40%.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default ApplicationSummary;
