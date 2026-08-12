import React from 'react';
import { Calendar, FileText, Loader2, Mail, Phone, Sparkles } from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format} from "date-fns";
import InternalNoteSection from '@/components/internal-note-section';

type Props = {
    data: CandidateWithDetails;
    softSkills: string[];
    technicalSkills: string[];
    resumeSummary: string;
};

const CandidateSummary = ({ data, softSkills, technicalSkills, resumeSummary }: Props) => {
    const candidate = data.candidate;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: AI Analysis & Bio */}
            <div className="lg:col-span-2 space-y-6">

                {/* AI Talent Assessment Card */}
                {/*<div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-zinc-900 tracking-tight">AI Talent Insights</h3>
                                <p className="text-xs text-zinc-400 font-medium">Powered by Gemini AI Engine</p>
                            </div>
                        </div>

                        {!aiAnalysis && !isAnalyzing && (
                            <button
                                onClick={handleAnalyzeWithAI}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-brand-500/20"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generate AI Report
                            </button>
                        )}
                    </div>

                    {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                            <p className="text-xs font-bold text-zinc-600 animate-pulse">Evaluating candidate skills against job requirements...</p>
                        </div>
                    )}

                    {aiAnalysis && (
                        <div className="prose prose-zinc max-w-none text-xs font-medium text-zinc-700 leading-relaxed bg-zinc-50/80 p-6 rounded-2xl border border-zinc-200/60">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                        </div>
                    )}

                    {!aiAnalysis && !isAnalyzing && (
                        <div className="bg-zinc-50/80 rounded-2xl p-6 border border-zinc-200/60 text-center space-y-2">
                            <p className="text-xs font-bold text-zinc-700">Get an instant AI match score and candidate breakdown</p>
                            <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                Click "Generate AI Report" to synthesize {candidate.name}'s experience, technical alignment, and screening recommendations.
                            </p>
                        </div>
                    )}
                </div>*/}

                {/* Bio & Resume Summary */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg text-zinc-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-600" />
                        Candidate Summary & Background
                    </h3>

                    <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                        {resumeSummary || `${candidate.name} is a seasoned ${candidate.role} with extensive hands-on experience building modern, resilient software architectures. Proficient across key backend and frontend stacks with a strong track record of engineering delivery.`}
                    </p>

                    <div className="pt-4 border-t border-zinc-100">
                        <h4 className="text-xs font-bold text-zinc-900 mb-3 uppercase tracking-wider">Top Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {technicalSkills.map((skill) => (
                                <span key={skill} className="px-3 py-1.5 bg-brand-50 border border-brand-200/60 rounded-xl text-xs font-bold text-brand-800">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="pt-3">
                        <h4 className="text-xs font-bold text-zinc-900 mb-3 uppercase tracking-wider">Soft Skills & Capabilities</h4>
                        <div className="flex flex-wrap gap-2">
                            {softSkills.map((sSkill) => (
                                <span key={sSkill} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700">
                                    {sSkill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Right Column: Contact Card & Quick Info */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-5">
                    <h3 className="font-bold text-base text-zinc-900 tracking-tight pb-3 border-b border-zinc-100">
                        Contact Details
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 text-zinc-500">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Email Address</p>
                                <p className="text-xs font-bold text-zinc-900">{candidate.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 text-zinc-500">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Phone Number</p>
                                <p className="text-xs font-bold text-zinc-900">{candidate.phone || '+1 (555) 234-5678'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 text-zinc-500">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Applied On</p>
                                <p className="text-xs font-bold text-zinc-900">{format(candidate.created_at, 'MM/dd/yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 space-y-2">
                        <button
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-primary-500/20"
                        >
                            Schedule Interview
                        </button>

                        <button
                            className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold transition-all"
                        >
                            Reject Candidate
                        </button>
                    </div>
                </div>
                
                <InternalNoteSection parent_type="candidate" parent_id={candidate.id} selectedId={candidate.id} />
            </div>

        </div>
    );
};

export default CandidateSummary;
