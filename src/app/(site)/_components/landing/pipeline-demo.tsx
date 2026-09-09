"use client";

import React, { useState } from 'react';
import {
    Kanban,
    Sparkles,
    Calendar,
    Mail,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    ChevronRight,
    Send,
    CalendarCheck,
    Briefcase,
    ExternalLink,   
} from 'lucide-react';
import { INITIAL_CANDIDATES, MOCK_JOBS, PIPELINE_STAGES } from '@/lib/constant';

interface TourProps {
    onOpenDemo: (mode?: 'demo' | 'trial') => void;
}

export const PipelineDemo: React.FC<TourProps> = ({ onOpenDemo }) => {
    const [activeTab, setActiveTab] = useState<'pipeline' | 'screening' | 'holds' | 'emails'>('pipeline');
    const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
    const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
    const [selectedCandidate, setSelectedCandidate] = useState(INITIAL_CANDIDATES[0]);
    const [holdPlaced, setHoldPlaced] = useState(true);
    const [emailTriggerType, setEmailTriggerType] = useState<'invite' | 'feedback' | 'hold'>('invite');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleMoveCandidate = (candidateId: string, targetStage) => {
        setCandidates((prev) =>
            prev.map((c) => {
                if (c.id === candidateId) {
                    return { ...c, stage: targetStage };
                }
                return c;
            })
        );
        if (selectedCandidate.id === candidateId) {
            setSelectedCandidate((prev) => ({ ...prev, stage: targetStage }));
        }
        const stageTitle = PIPELINE_STAGES.find((s) => s.id === targetStage)?.title || targetStage;
        showToast(`Candidate moved to ${stageTitle}. Automated workflow triggered!`);
    };

    return (
        <section id="pipeline" className="py-16 md:py-24 bg-white border-y border-[#e8e6dc] relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3 border border-slate-200">
                        <Kanban className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Interactive Product Experience</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        See how hiring feels when your ATS works for you.
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600">
                        Click through aplico’s live pipeline below. Drag candidates, inspect automated AI scorecards, place calendar holds, and test automated email triggers in real-time.
                    </p>
                </div>

                {/* Feature Navigation Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'pipeline'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-[#f4f3ed] text-slate-700 hover:bg-[#eae8df]'
                            }`}
                    >
                        <Kanban className="w-4 h-4 text-emerald-400" />
                        <span>1. Visual Candidate Pipeline</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('screening')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'screening'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-[#f4f3ed] text-slate-700 hover:bg-[#eae8df]'
                            }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>2. Automated Screening & AI Rubric</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('holds')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'holds'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-[#f4f3ed] text-slate-700 hover:bg-[#eae8df]'
                            }`}
                    >
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>3. Smart Interview Holds</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('emails')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'emails'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-[#f4f3ed] text-slate-700 hover:bg-[#eae8df]'
                            }`}
                    >
                        <Mail className="w-4 h-4 text-purple-400" />
                        <span>4. Automated Candidate Comms</span>
                    </button>
                </div>

                {/* The Simulated aplico App Frame */}
                <div className="rounded-2xl border border-slate-300 bg-white shadow-xl overflow-hidden">
                    {/* Simulated Browser Chrome / App Topbar */}
                    <div className="bg-slate-900 text-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <div className="h-4 w-px bg-slate-700" />
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    aplico ATS
                                </span>
                                <span className="text-slate-500">/</span>
                                <span>Acme Cloud Technologies</span>
                            </div>
                        </div>

                        {/* Role dropdown switcher */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-800/90 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-white">
                                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-semibold">{selectedJob.title}</span>
                                <span className="text-slate-400 text-[11px] hidden sm:inline">({selectedJob.location})</span>
                            </div>
                            <button
                                onClick={() => onOpenDemo('trial')}
                                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span>Live Sandbox</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Toast alert simulation */}
                    {toastMessage && (
                        <div className="bg-emerald-900 text-emerald-100 text-xs py-2 px-4 flex items-center justify-between animate-in fade-in duration-150">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="font-medium">{toastMessage}</span>
                            </div>
                            <button onClick={() => setToastMessage(null)} className="text-emerald-300 hover:text-white text-xs">
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* TAB 1: KANBAN PIPELINE */}
                    {activeTab === 'pipeline' && (
                        <div className="p-4 sm:p-6 bg-[#f9f8f3] min-h-[580px]">
                            {/* Pipeline summary stats */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-[#e5e3d8]">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <span>Active Candidate Pipeline</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                            {candidates.length} active in loop
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Drag or click candidate cards to advance stages or view AI rubric details.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-medium">Auto-Screening:</span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                        <Sparkles className="w-3 h-3" /> Enabled (Threshold: 80%)
                                    </span>
                                </div>
                            </div>

                            {/* Kanban columns */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
                                {PIPELINE_STAGES.map((stage) => {
                                    const stageCandidates = candidates.filter((c) => c.stage === stage.id);
                                    return (
                                        <div
                                            key={stage.id}
                                            className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200/80 p-3 flex flex-col min-h-[460px] shadow-xs"
                                        >
                                            {/* Column Header */}
                                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-900">{stage.title}</span>
                                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                        {stageCandidates.length}
                                                    </span>
                                                </div>
                                                {stage.id === 'screening' && (
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" title="Automated AI Scoring Active" />
                                                )}
                                                {stage.id === 'interview_hold' && (
                                                    <CalendarCheck className="w-3.5 h-3.5 text-blue-500" title="Auto Calendar Holds" />
                                                )}
                                            </div>

                                            {/* Cards in this stage */}
                                            <div className="flex-1 space-y-2.5">
                                                {stageCandidates.map((cand) => (
                                                    <div
                                                        key={cand.id}
                                                        onClick={() => setSelectedCandidate(cand)}
                                                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all hover:shadow-md ${selectedCandidate.id === cand.id
                                                                ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={cand.avatar}
                                                                    alt={cand.name}
                                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                                                />
                                                                <div>
                                                                    <h4 className="font-semibold text-xs text-slate-900 leading-tight">
                                                                        {cand.name}
                                                                    </h4>
                                                                    <p className="text-[10px] text-slate-500">{cand.currentCompany}</p>
                                                                </div>
                                                            </div>
                                                            {/* Match Score Badge */}
                                                            <div
                                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${cand.score >= 90
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : cand.score >= 80
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-rose-100 text-rose-800'
                                                                    }`}
                                                            >
                                                                <span>{cand.score}%</span>
                                                            </div>
                                                        </div>

                                                        {/* Candidate mini skills */}
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {cand.skills.slice(0, 3).map((s) => (
                                                                <span
                                                                    key={s}
                                                                    className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                                                >
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Interview hold or stage label */}
                                                        {cand.interviewHoldStatus && (
                                                            <div className="mb-2 py-1 px-1.5 rounded bg-blue-50 border border-blue-200 flex items-center gap-1 text-[10px] text-blue-800 font-medium">
                                                                <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                                                                <span className="truncate">{cand.interviewHoldStatus}</span>
                                                            </div>
                                                        )}

                                                        {/* Quick Advance Controls */}
                                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                                            <span className="text-[10px] text-slate-400">{cand.appliedDate}</span>
                                                            <div className="flex items-center gap-1">
                                                                {stage.id !== 'offer' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const stages = [
                                                                                'applied',
                                                                                'screening',
                                                                                'interview_hold',
                                                                                'team_round',
                                                                                'offer',
                                                                            ];
                                                                            const nextIdx = stages.indexOf(stage.id) + 1;
                                                                            if (nextIdx < stages.length) {
                                                                                handleMoveCandidate(cand.id, stages[nextIdx]);
                                                                            }
                                                                        }}
                                                                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                                                    >
                                                                        <span>Advance</span>
                                                                        <ChevronRight className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {stageCandidates.length === 0 && (
                                                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                                                        <span>No candidates in this stage</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected Candidate Quick-Inspector Drawer at bottom */}
                            <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedCandidate.avatar}
                                        alt={selectedCandidate.name}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm text-slate-900">{selectedCandidate.name}</h4>
                                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                                {selectedCandidate.role}
                                            </span>
                                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                                {selectedCandidate.score}% AI Match
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 max-w-2xl line-clamp-1">
                                            {selectedCandidate.summary}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                                    <button
                                        onClick={() => setActiveTab('screening')}
                                        className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        <span>View AI Rubric Details</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('holds')}
                                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Schedule Interview Hold</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: AUTOMATED AI SCREENING & RUBRIC */}
                    {activeTab === 'screening' && (
                        <div className="p-4 sm:p-6 bg-white min-h-[580px]">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-amber-100 text-amber-800">
                                                <Sparkles className="w-4 h-4" />
                                            </span>
                                            <h3 className="font-bold text-lg text-slate-900">
                                                AI-Assisted Candidate Review & Rubric
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Evaluated against the criteria set by your hiring team for {selectedJob.title}.
                                        </p>
                                    </div>

                                    {/* Candidate switcher */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        {candidates.slice(0, 3).map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedCandidate(c)}
                                                className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${selectedCandidate.id === c.id
                                                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                            >
                                                {c.name.split(' ')[0]} ({c.score}%)
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left Column: Candidate snapshot */}
                                    <div className="md:col-span-1 bg-[#fbfaf6] p-4 rounded-xl border border-slate-200">
                                        <div className="text-center pb-4 border-b border-slate-200">
                                            <img
                                                src={selectedCandidate.avatar}
                                                alt={selectedCandidate.name}
                                                className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-emerald-500 mb-2"
                                            />
                                            <h4 className="font-bold text-slate-900 text-sm">{selectedCandidate.name}</h4>
                                            <p className="text-xs text-slate-500">{selectedCandidate.currentCompany}</p>
                                            <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>{selectedCandidate.score}% Rubric Match</span>
                                            </div>
                                        </div>

                                        <div className="py-3 text-xs space-y-2.5">
                                            <div>
                                                <span className="text-slate-400 font-medium">Applied Via:</span>
                                                <p className="font-semibold text-slate-800">{selectedCandidate.source}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-medium">Relevant Experience:</span>
                                                <p className="font-semibold text-slate-800">
                                                    {selectedCandidate.experienceYears} Years (Threshold: 5+)
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-medium">Matched Skills:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedCandidate.skills.map((sk) => (
                                                        <span
                                                            key={sk}
                                                            className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                        >
                                                            {sk}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200 space-y-2">
                                            <button
                                                onClick={() => {
                                                    handleMoveCandidate(selectedCandidate.id, 'interview_hold');
                                                    setActiveTab('holds');
                                                }}
                                                className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span>Advance to Interview Hold</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveTab('emails');
                                                    setEmailTriggerType('feedback');
                                                }}
                                                className="w-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition-colors"
                                            >
                                                Draft Automated Feedback
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right 2 Columns: Detailed AI Rubric Breakdown */}
                                    <div className="md:col-span-2 space-y-4">
                                        {/* Rubric Breakdown Cards */}
                                        <div className="p-4 rounded-xl border border-slate-200 bg-white">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                                Rubric Alignment Scorecard
                                            </h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                                        <span className="text-slate-800">1. TypeScript & Modern Frontend Architecture</span>
                                                        <span className="text-emerald-700">98% Match</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '98%' }} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                                        <span className="text-slate-800">2. Distributed Systems & PostgreSQL Scaling</span>
                                                        <span className="text-emerald-700">92% Match</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '92%' }} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                                        <span className="text-slate-800">3. Startup Velocity & Cross-functional Ownership</span>
                                                        <span className="text-emerald-700">95% Match</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '95%' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Verified Signals & Highlights */}
                                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span>AI Verified Standout Strengths</span>
                                            </div>
                                            <ul className="space-y-1.5 text-xs text-slate-700">
                                                {selectedCandidate.aiHighlights.map((hl, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-emerald-600 font-bold">•</span>
                                                        <span>{hl}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Flags or considerations */}
                                        {selectedCandidate.aiFlags.length > 0 && (
                                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                                    <span>Noteworthy Details for Hiring Manager</span>
                                                </div>
                                                <ul className="space-y-1 text-xs text-slate-700">
                                                    {selectedCandidate.aiFlags.map((fl, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-amber-600 font-bold">•</span>
                                                            <span>{fl}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SMART INTERVIEW HOLDS */}
                    {activeTab === 'holds' && (
                        <div className="p-4 sm:p-6 bg-white min-h-[580px]">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-blue-100 text-blue-800">
                                                <Calendar className="w-4 h-4" />
                                            </span>
                                            <h3 className="font-bold text-lg text-slate-900">
                                                Smart Interview Holds & Calendar Coordination
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Never lose a slot again. aplico places tentative holds on interviewers’ calendars until the candidate confirms.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setHoldPlaced(!holdPlaced);
                                            showToast(
                                                !holdPlaced
                                                    ? 'Calendar holds locked on Google Calendar for hiring team'
                                                    : 'Holds released from calendar'
                                            );
                                        }}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${holdPlaced
                                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                                : 'bg-slate-100 border-slate-300 text-slate-700'
                                            }`}
                                    >
                                        <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{holdPlaced ? 'Interview Holds Active' : 'Enable Holds'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Left Column: Interview Hold Explanation */}
                                    <div className="md:col-span-1 bg-[#f7f9fc] p-4 rounded-xl border border-blue-100 space-y-4">
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900 mb-2">
                                                How It Solves SMB Hiring
                                            </h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Legacy scheduling sends a Calendly link, but by the time a candidate picks a time 2 days later, the interviewer has been double-booked by internal meetings.
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs space-y-2">
                                            <div className="flex items-center gap-2 text-slate-900 font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span>The aplico Advantage:</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600">
                                                1. Select 3 optimal 45-minute windows.<br />
                                                2. aplico blocks tentative holds on Google/Outlook.<br />
                                                3. When candidate chooses slot, remaining holds auto-release instantly!
                                            </p>
                                        </div>

                                        <div className="pt-2 text-xs">
                                            <span className="text-slate-400 font-medium">Assigned Interview Loop:</span>
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                                        SC
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-xs">Sarah Chen</p>
                                                        <p className="text-[10px] text-slate-500">VP of Engineering</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                                                        DM
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-xs">David Miller</p>
                                                        <p className="text-[10px] text-slate-500">Staff Architect</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Live Interactive Calendar Hold Mockup */}
                                    <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800">Week of Sep 8 – Sep 12</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                    Synced with Google Workspace
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> 2 Team Members Synced
                                            </span>
                                        </div>

                                        {/* Schedule Slots */}
                                        <div className="space-y-3">
                                            {/* Slot 1 - Active Hold */}
                                            <div className="p-3 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/60 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-600 text-white">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-blue-950">Tuesday, 2:00 PM – 2:45 PM</span>
                                                            <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">
                                                                Tentative Hold Placed
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-blue-700 mt-0.5">
                                                            Reserved for {selectedCandidate.name} (Tech Deep Dive)
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-blue-800 bg-white px-2.5 py-1 rounded shadow-xs">
                                                    Expires in 18h
                                                </span>
                                            </div>

                                            {/* Slot 2 - Active Hold */}
                                            <div className="p-3 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/60 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-600 text-white">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-blue-950">Wednesday, 10:30 AM – 11:15 AM</span>
                                                            <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">
                                                                Tentative Hold Placed
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-blue-700 mt-0.5">
                                                            Reserved for {selectedCandidate.name} (Option 2)
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-blue-800 bg-white px-2.5 py-1 rounded shadow-xs">
                                                    Expires in 24h
                                                </span>
                                            </div>

                                            {/* Slot 3 - Confirmed Booking */}
                                            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-emerald-600 text-white">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-emerald-950">Thursday, 3:30 PM – 4:15 PM</span>
                                                            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">
                                                                Confirmed by Julian Hayes
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-emerald-700 mt-0.5">
                                                            Google Meet link generated • Calendar invite sent
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold text-emerald-800 bg-white px-2.5 py-1 rounded shadow-xs">
                                                    Confirmed
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                            <span>Candidate self-scheduling page automatically closes expired holds.</span>
                                            <button
                                                onClick={() => {
                                                    setActiveTab('emails');
                                                    setEmailTriggerType('invite');
                                                }}
                                                className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
                                            >
                                                <span>Send Booking Invite via Automated Email</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: AUTOMATED EMAIL COMMUNICATOR */}
                    {activeTab === 'emails' && (
                        <div className="p-4 sm:p-6 bg-white min-h-[580px]">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 rounded bg-purple-100 text-purple-800">
                                                <Mail className="w-4 h-4" />
                                            </span>
                                            <h3 className="font-bold text-lg text-slate-900">
                                                Automated Candidate Communication Loops
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Never ghost an applicant again. Personalized emails trigger instantly based on pipeline stage changes.
                                        </p>
                                    </div>

                                    {/* Template switcher */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setEmailTriggerType('invite')}
                                            className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${emailTriggerType === 'invite'
                                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Interview Invite
                                        </button>
                                        <button
                                            onClick={() => setEmailTriggerType('feedback')}
                                            className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${emailTriggerType === 'feedback'
                                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Kind Rejection + Feedback
                                        </button>
                                        <button
                                            onClick={() => setEmailTriggerType('hold')}
                                            className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${emailTriggerType === 'hold'
                                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Stage Hold Update
                                        </button>
                                    </div>
                                </div>

                                {/* Email Preview Container */}
                                <div className="bg-[#faf9f6] rounded-xl border border-slate-200 p-5 shadow-xs">
                                    <div className="space-y-2 pb-4 border-b border-slate-200 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-semibold w-16">Trigger:</span>
                                            <span className="font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                                                {emailTriggerType === 'invite' && 'Stage moved to: Interview Hold'}
                                                {emailTriggerType === 'feedback' && 'Stage moved to: Archived / Not Selected'}
                                                {emailTriggerType === 'hold' && 'Candidate in review > 3 days'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-semibold w-16">To:</span>
                                            <span className="text-slate-800 font-mono">
                                                {selectedCandidate.name.toLowerCase().replace(' ', '.')}@example.com
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-semibold w-16">Subject:</span>
                                            <span className="font-bold text-slate-900">
                                                {emailTriggerType === 'invite' && `Next Steps: ${selectedJob.title} interview with Acme`}
                                                {emailTriggerType === 'feedback' && `Update regarding your application for ${selectedJob.title}`}
                                                {emailTriggerType === 'hold' && `Quick update on your application with Acme Cloud`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Body Content */}
                                    <div className="py-5 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans space-y-3">
                                        <p>Hi {selectedCandidate.name.split(' ')[0]},</p>

                                        {emailTriggerType === 'invite' && (
                                            <>
                                                <p>
                                                    Our team was really impressed by your background at{' '}
                                                    <span className="font-semibold">{selectedCandidate.currentCompany}</span> and your deep experience in{' '}
                                                    <span className="font-semibold">{selectedCandidate.skills.slice(0, 2).join(' & ')}</span>.
                                                </p>
                                                <p>
                                                    We would love to invite you to a 45-minute technical conversation with{' '}
                                                    <span className="font-semibold">Sarah Chen (VP of Engineering)</span>. We have placed tentative holds on our calendars for you.
                                                </p>
                                                <div className="my-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                                                    <p className="text-xs font-semibold text-emerald-900 mb-2">
                                                        Select your preferred time slot below (holds are reserved):
                                                    </p>
                                                    <a
                                                        href="#holds"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setActiveTab('holds');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                                                    >
                                                        <span>Pick a 45-min Interview Time</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </>
                                        )}

                                        {emailTriggerType === 'feedback' && (
                                            <>
                                                <p>
                                                    Thank you so much for taking the time to share your experience with us for the{' '}
                                                    <span className="font-semibold">{selectedJob.title}</span> role.
                                                </p>
                                                <p>
                                                    While your technical background in {selectedCandidate.skills[0]} is impressive, our team decided to move forward with a candidate whose current focus aligns even closer with our immediate infrastructure timeline.
                                                </p>
                                                <p className="text-slate-600 bg-white p-3 rounded border border-slate-200 text-xs">
                                                    💡 <span className="font-semibold">Constructive AI Note:</span> We loved your recent open-source work and would love to reconnect when our dedicated platform team opens next quarter.
                                                </p>
                                            </>
                                        )}

                                        {emailTriggerType === 'hold' && (
                                            <>
                                                <p>
                                                    Just wanted to send a quick note that your application for{' '}
                                                    <span className="font-semibold">{selectedJob.title}</span> is actively with our hiring panel.
                                                </p>
                                                <p>
                                                    We know waiting on hiring teams is frustrating, so we promise you’ll have a definitive update from us by tomorrow at 5:00 PM EST.
                                                </p>
                                            </>
                                        )}

                                        <p className="pt-2 text-slate-500 text-xs">
                                            Best,<br />
                                            <span className="font-semibold text-slate-800">The Acme Cloud Hiring Team</span>
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>Zero-Ghost Guarantee enabled across all pipelines</span>
                                        </div>
                                        <button
                                            onClick={() => showToast('Automated email loop saved & published!')}
                                            className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Test Trigger Loop</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
