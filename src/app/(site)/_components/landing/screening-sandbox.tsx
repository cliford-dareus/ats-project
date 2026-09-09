"use client";

import React, { useState } from 'react';
import {
    Sparkles,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    FileText,
    UserCheck,
    ArrowRight,
    EyeOff,
    Eye,
    RefreshCw,
    Award,
    Zap,
    Check
} from 'lucide-react';

interface SampleApplicant {
    id: string;
    name: string;
    anonymousName: string;
    role: string;
    experienceYears: number;
    skills: string[];
    bio: string;
    keyAchievement: string;
    education: string;
    expectedScore: number;
    tier: 'Strong Match' | 'Potential Match' | 'Gaps Detected';
}

const SAMPLE_APPLICANTS: SampleApplicant[] = [
    {
        id: 'app-1',
        name: 'Maya Lin',
        anonymousName: 'Candidate #4092 (Bias Shield)',
        role: 'Staff Frontend Engineer',
        experienceYears: 7,
        skills: ['TypeScript', 'React 19', 'Next.js', 'Web Performance', 'Design Systems'],
        bio: 'Lead frontend architect at a 150-person SaaS company. Built micro-frontend migration and lowered Core Web Vitals LCP from 3.8s to 0.9s.',
        keyAchievement: 'Spearheaded design system adoption across 14 product squads, reducing sprint cycle times by 22%.',
        education: 'B.S. Computer Science (2018)',
        expectedScore: 96,
        tier: 'Strong Match',
    },
    {
        id: 'app-2',
        name: 'Liam Gallagher',
        anonymousName: 'Candidate #8104 (Bias Shield)',
        role: 'Full-Stack Developer',
        experienceYears: 4,
        skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
        bio: 'Mid-level developer working at digital agency. Good UI chops, but primarily builds marketing sites and basic internal dashboards.',
        keyAchievement: 'Delivered 18 client web applications on schedule with 100% client satisfaction.',
        education: 'Coding Bootcamp Graduate (2021)',
        expectedScore: 74,
        tier: 'Potential Match',
    },
    {
        id: 'app-3',
        name: 'David Kowalski',
        anonymousName: 'Candidate #1920 (Bias Shield)',
        role: 'Senior Backend Engineer',
        experienceYears: 8,
        skills: ['Java', 'Spring Boot', 'Oracle SQL', 'Kafka', 'Docker'],
        bio: 'Senior engineer from enterprise banking. Exceptional backend data integrity, but zero modern TypeScript or frontend application experience.',
        keyAchievement: 'Maintained 99.999% uptime for core ledger processing pipeline handling $40M daily volume.',
        education: 'M.S. Software Engineering (2016)',
        expectedScore: 68,
        tier: 'Gaps Detected',
    },
];

export const ScreeningSandbox: React.FC = () => {
    const [selectedApplicant, setSelectedApplicant] = useState<SampleApplicant>(SAMPLE_APPLICANTS[0]);
    const [isScreening, setIsScreening] = useState(false);
    const [biasShieldActive, setBiasShieldActive] = useState(false);
    const [screenedApplicantId, setScreenedApplicantId] = useState<string>(SAMPLE_APPLICANTS[0].id);
    const [rubricWeight, setRubricWeight] = useState({
        technicalChops: 40,
        domainExperience: 35,
        startupVelocity: 25,
    });

    const handleRunScreening = (applicant: SampleApplicant) => {
        setSelectedApplicant(applicant);
        setIsScreening(true);
        setTimeout(() => {
            setIsScreening(false);
            setScreenedApplicantId(applicant.id);
        }, 700);
    };

    return (
        <section id="screening" className="py-16 md:py-24 bg-[#faf9f6] border-b border-[#e8e6dc]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>AI-Assisted Resume Review & Screening</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Screen 200 applicants in 2 minutes. Without missing the diamonds.
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600">
                        No black-box algorithms. aplico uses transparent, team-defined rubrics that evaluate applicants against your actual job requirements, extracting verified signals while shielding against unconscious bias.
                    </p>
                </div>

                {/* Sandbox interactive card */}
                <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden">
                    {/* Controls Bar */}
                    <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Select Test Applicant:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {SAMPLE_APPLICANTS.map((applicant) => (
                                    <button
                                        key={applicant.id}
                                        onClick={() => handleRunScreening(applicant)}
                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${selectedApplicant.id === applicant.id
                                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                    >
                                        {biasShieldActive ? applicant.anonymousName.split(' ')[1] : applicant.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bias Shield Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setBiasShieldActive(!biasShieldActive)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${biasShieldActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                    }`}
                            >
                                {biasShieldActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>Bias Shield: {biasShieldActive ? 'ON (Blind Review)' : 'OFF'}</span>
                            </button>

                            <button
                                onClick={() => handleRunScreening(selectedApplicant)}
                                disabled={isScreening}
                                className="text-xs bg-white text-slate-900 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-all"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isScreening ? 'animate-spin' : ''}`} />
                                <span>Re-score Applicant</span>
                            </button>
                        </div>
                    </div>

                    {/* Sandbox Body */}
                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left 5 Cols: The Applicant Profile */}
                        <div className="lg:col-span-5 bg-[#fbfaf6] p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            Incoming Resume Data
                                        </span>
                                    </div>
                                    {biasShieldActive && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                            Shield Active (Zero PII)
                                        </span>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {biasShieldActive ? selectedApplicant.anonymousName : selectedApplicant.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Target Role: Staff Frontend Engineer (Acme Core Web)
                                    </p>
                                    {!biasShieldActive && (
                                        <p className="text-[11px] text-slate-400 mt-0.5">Education: {selectedApplicant.education}</p>
                                    )}
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 font-medium">Career Overview:</span>
                                        <p className="text-slate-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                                            {selectedApplicant.bio}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-medium">Quantified Impact Highlight:</span>
                                        <p className="text-slate-800 font-medium mt-0.5 leading-relaxed bg-emerald-50/50 p-2.5 rounded border border-emerald-200 text-emerald-950">
                                            "{selectedApplicant.keyAchievement}"
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-medium">Extracted Technical Skills:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedApplicant.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="bg-white border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                <span>Experience: {selectedApplicant.experienceYears} Years</span>
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Work History
                                </span>
                            </div>
                        </div>

                        {/* Right 7 Cols: The Live AI Evaluation & Match Result */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                            {isScreening ? (
                                <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                                    <p className="font-bold text-slate-800 text-sm">Evaluating applicant against custom role rubric...</p>
                                    <p className="text-xs text-slate-500 mt-1">Cross-referencing technical skills, scale metrics, and tenure.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Score & Recommendation Banner */}
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                aplico Smart Rubric Result
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-3xl font-extrabold text-slate-900">
                                                    {selectedApplicant.expectedScore}%
                                                </span>
                                                <span
                                                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedApplicant.expectedScore >= 90
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : selectedApplicant.expectedScore >= 75
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                >
                                                    {selectedApplicant.tier}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Suggestion */}
                                        <div className="text-right">
                                            <span className="text-xs text-slate-400 font-medium">Recommended Action:</span>
                                            <p className="text-xs font-bold text-slate-900 mt-0.5">
                                                {selectedApplicant.expectedScore >= 90
                                                    ? 'Immediate Technical Interview Hold'
                                                    : selectedApplicant.expectedScore >= 75
                                                        ? 'Send Asynchronous Screening Form'
                                                        : 'Automated Empathetic Decline'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rubric Breakdown Sliders */}
                                    <div className="space-y-3 p-4 rounded-xl bg-[#fbfaf6] border border-slate-200">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Criteria Weighted Scoring
                                        </h4>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                                                <span>TypeScript & React 19 Ecosystem Mastery</span>
                                                <span className="font-bold text-emerald-700">
                                                    {selectedApplicant.skills.includes('TypeScript') ? '100% (Weight 40%)' : '40% (Weight 40%)'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: selectedApplicant.skills.includes('TypeScript') ? '100%' : '40%',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                                                <span>High-Impact Scaling / Design Systems</span>
                                                <span className="font-bold text-emerald-700">
                                                    {selectedApplicant.id === 'app-1'
                                                        ? '95% (Weight 35%)'
                                                        : selectedApplicant.id === 'app-2'
                                                            ? '68% (Weight 35%)'
                                                            : '60% (Weight 35%)'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width:
                                                            selectedApplicant.id === 'app-1'
                                                                ? '95%'
                                                                : selectedApplicant.id === 'app-2'
                                                                    ? '68%'
                                                                    : '60%',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                                                <span>Startup Autonomy & Quantified Velocity</span>
                                                <span className="font-bold text-emerald-700">
                                                    {selectedApplicant.id === 'app-1'
                                                        ? '92% (Weight 25%)'
                                                        : selectedApplicant.id === 'app-2'
                                                            ? '85% (Weight 25%)'
                                                            : '70% (Weight 25%)'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width:
                                                            selectedApplicant.id === 'app-1'
                                                                ? '92%'
                                                                : selectedApplicant.id === 'app-2'
                                                                    ? '85%'
                                                                    : '70%',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Extracted Interview Questions for Hiring Manager */}
                                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-2">
                                            <Sparkles className="w-4 h-4 text-emerald-600" />
                                            <span>Suggested Interview Probes for Hiring Manager:</span>
                                        </div>
                                        <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                                            {selectedApplicant.id === 'app-1' && (
                                                <>
                                                    <li>"Ask Maya to walk through the Core Web Vitals optimization on her previous SaaS app."</li>
                                                    <li>"How did she achieve buy-in across 14 product squads for the unified design system?"</li>
                                                </>
                                            )}
                                            {selectedApplicant.id === 'app-2' && (
                                                <>
                                                    <li>"Explore Liam's experience handling production incidents on scale beyond agency setups."</li>
                                                    <li>"Assess TypeScript readiness: is he willing to complete a 30-minute coding exercise?"</li>
                                                </>
                                            )}
                                            {selectedApplicant.id === 'app-3' && (
                                                <>
                                                    <li>"Clarify why David is looking to transition away from high-scale Java banking systems."</li>
                                                    <li>"Would he consider a dedicated backend/data platform role rather than frontend?"</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Bottom Actions */}
                            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Every applicant gets a transparent score breakdown. No hidden rejection algorithms.
                                </span>
                                <a
                                    href="#pipeline"
                                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                                >
                                    <span>See How Screened Candidates Enter Pipeline</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
