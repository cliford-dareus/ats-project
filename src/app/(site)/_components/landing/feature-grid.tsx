"use client";

import React from 'react';
import {
    Sparkles,
    Kanban,
    Calendar,
    Mail,
    Shield,
    CheckCircle,
    Zap,
    Globe,
    Sliders,
} from 'lucide-react';

export const FeatureGrid: React.FC = () => {
    return (
        <section id="features" className="py-16 md:py-24 bg-white border-b border-[#e8e6dc]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Title */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Core Capabilities</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Everything your hiring team needs. Nothing they don't.
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600">
                        Enterprise ATS platforms are bloated with compliance modules and complex workflows designed for 10,000-person conglomerates. aplico is built specifically for growing 10 to 500 person organizations that want speed, clarity, and great candidate experience.
                    </p>
                </div>

                {/* 5 Feature Cards Grid (Asymmetric Bento style) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Card 1: Automated Screening & AI Resume Review (Featured Large 7 cols) */}
                    <div className="md:col-span-7 bg-[#fbfaf6] rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-5">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                Automated Screening & AI Review
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 mb-3">
                                Score 200+ applicants against your exact role rubric in seconds.
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                Stop spending Sunday nights scanning generic bullet points. aplico evaluates resumes against your team's custom rubric—scoring hard technical requirements, years of domain tenure, and quantified accomplishments while highlighting specific interview questions.
                            </p>

                            {/* Visual feature mockup snippet */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5 text-xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-medium">
                                    <span className="text-slate-800 font-semibold">Custom Rubric: Staff Engineer</span>
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Auto-Rank: Active</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span>• Modern TypeScript & Micro-frontends (40%)</span>
                                    <span className="font-semibold text-slate-900">Verified 98%</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span>• Team Leadership & Mentorship (30%)</span>
                                    <span className="font-semibold text-slate-900">Verified 90%</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <span>• Startup Velocity & Low Bureaucracy (30%)</span>
                                    <span className="font-semibold text-slate-900">Verified 95%</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" /> EEOC Bias Shield
                            </span>
                            <span className="flex items-center gap-1">
                                <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Adjustable Weights
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Smart Interview Holds (5 cols) */}
                    <div className="md:col-span-5 bg-[#f7f9fc] rounded-2xl border border-blue-100 p-6 sm:p-8 flex flex-col justify-between hover:border-blue-200 transition-all">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-5">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                                Exclusive Innovation
                            </span>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 mb-3">
                                Smart Calendar Holds
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                Never lose a great candidate to internal double-booking. aplico reserves tentative calendar holds across your interview loop so interviewers don't get scheduled over while candidates choose a slot.
                            </p>

                            <div className="p-3.5 bg-white rounded-xl border border-blue-200 text-xs space-y-2">
                                <div className="flex items-center justify-between font-semibold text-blue-950">
                                    <span>Hold: Tuesday 2:00 PM (45m)</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Auto-Releases in 24h</span>
                                </div>
                                <p className="text-slate-500 text-[11px]">
                                    Shared with Sarah (VP Eng) & Dave (Staff Eng). Slot confirms automatically upon candidate booking.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-blue-200/60 flex items-center gap-4 text-xs text-slate-500 font-medium">
                            <span>Google Calendar</span>
                            <span>•</span>
                            <span>Microsoft Outlook</span>
                            <span>•</span>
                            <span>Round-Robin</span>
                        </div>
                    </div>

                    {/* Card 3: Visual Candidate Pipeline (4 cols) */}
                    <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-5">
                                <Kanban className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                Pipeline Management
                            </span>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2">
                                Drag-and-Drop Visual Funnel
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Customizable stages tailored to each department. Set SLA timers so candidates never sit stuck in review, with 1-click stage advancement and collaborative team scorecards.
                            </p>
                        </div>

                        <ul className="mt-6 space-y-2 text-xs text-slate-700">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Custom stages for Dev, Sales & Ops</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Slack & Teams alert on SLA breach</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Fast keyboard navigation (J/K/Enter)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Card 4: Automated Candidate Emails (4 cols) */}
                    <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-5">
                                <Mail className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                                Candidate Experience
                            </span>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2">
                                Automated Email Sequences
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Send personalized updates the instant candidates move stages. Deliver warm, respectful feedback to unselected candidates without requiring hours of manual email drafting.
                            </p>
                        </div>

                        <ul className="mt-6 space-y-2 text-xs text-slate-700">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                <span>Zero-Ghosting automated loops</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                <span>Smart dynamic variables & tokens</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                                <span>Send from your actual company domain</span>
                            </li>
                        </ul>
                    </div>

                    {/* Card 5: 1-Click Multi-Board Job Postings (4 cols) */}
                    <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-5">
                                <Globe className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                                Job Distribution
                            </span>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2">
                                Multi-Board Distribution
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Post once, distribute everywhere. Automatically syndicate your roles to LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Google Jobs with a clean hosted careers portal included.
                            </p>
                        </div>

                        <ul className="mt-6 space-y-2 text-xs text-slate-700">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                <span>Branded careers portal with custom domain</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                <span>Syndication to 12+ free & paid job boards</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                                <span>Integrated applicant UTM tracking</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};
