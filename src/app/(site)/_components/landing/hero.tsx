"use client";

import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles, Play, Users, Clock, CalendarCheck } from 'lucide-react';

interface HeroProps {
    onOpenDemo: (mode?: 'demo' | 'trial') => void;
    onExploreDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDemo, onExploreDemo }) => {
    return (
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
            {/* Subtle organic background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-emerald-100/60 via-teal-50/40 to-transparent blur-3xl -z-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Pill badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Purpose-built for teams of 10 to 100</span>
                    <span className="text-emerald-400">|</span>
                    <span className="text-emerald-700 font-medium">Replaces clunky legacy systems</span>
                </div>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.1] mb-6">
                    Hiring in sequence{' '}
                    <span className="relative whitespace-nowrap">
                        <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                            not in chaos.
                        </span>
                        <span className="absolute bottom-1 left-0 w-full h-3 bg-emerald-200/50 -rotate-1 rounded-sm -z-0" />
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-8">
                    The all-in-one ATS for small and mid-sized organizations. Automated candidate screening, visual pipelines, automated email, interview holds, and AI-assisted resume review.
                    <span className="block mt-1 font-semibold text-slate-800">
                        Built for the people who actually do the hiring.
                    </span>
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
                    <button
                        id="hero-start-trial-btn"
                        onClick={() => onOpenDemo('trial')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg shadow-emerald-700/20 active:scale-[0.98] transition-all"
                    >
                        <span>Start 14-Day Free Trial</span>
                        <ArrowRight className="w-5 h-5 text-emerald-100" />
                    </button>

                    <button
                        id="hero-explore-demo-btn"
                        onClick={onExploreDemo}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-base font-semibold px-6 py-3.5 rounded-xl shadow-xs hover:border-slate-400 active:scale-[0.98] transition-all"
                    >
                        <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        <span>Try Live Pipeline Demo</span>
                    </button>
                </div>

                {/* Frictionless reassurance tags */}
                <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-500 font-medium mb-14">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>15-minute team setup</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>1-click import from any ATS or sheet</span>
                    </div>
                </div>

                {/* Quick quantitative impact banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl bg-white border border-[#e8e6dc] shadow-xs text-left mb-14">
                    <div className="p-3 border-r-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-2xl sm:text-3xl tracking-tight">
                            <span>72%</span>
                            <Zap className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 mt-1">Faster Resume Screening</p>
                        <p className="text-[11px] text-slate-500 leading-tight">AI rubric parses 200+ applicants in seconds</p>
                    </div>

                    <div className="p-3 border-r-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-2xl sm:text-3xl tracking-tight">
                            <span>0</span>
                            <Users className="w-4 h-4 text-teal-600" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 mt-1">Ghosted Candidates</p>
                        <p className="text-[11px] text-slate-500 leading-tight">Automated, empathetic rejection & invite loops</p>
                    </div>

                    <div className="p-3 border-r-0 md:border-r border-slate-100">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-2xl sm:text-3xl tracking-tight">
                            <span>100%</span>
                            <CalendarCheck className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 mt-1">Zero Double-Booking</p>
                        <p className="text-[11px] text-slate-500 leading-tight">Smart calendar holds reserved before booking</p>
                    </div>

                    <div className="p-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-2xl sm:text-3xl tracking-tight">
                            <span>12 days</span>
                            <Clock className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-semibold text-slate-900 mt-1">Avg Time-to-Offer</p>
                        <p className="text-[11px] text-slate-500 leading-tight">Down from standard 38 days industry avg</p>
                    </div>
                </div>

                {/* Social Proof Logos */}
                <div className="pt-2 border-t border-slate-200/80 max-w-4xl mx-auto">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-5">
                        Trusted by hiring managers and fast teams worldwide
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-800">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs">V</span>
                            <span>Vektor</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-800">
                            <span className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center text-xs">C</span>
                            <span>Craftly</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-800">
                            <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">N</span>
                            <span>Northwind</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-800">
                            <span className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs">S</span>
                            <span>Scribe Health</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-800">
                            <span className="w-6 h-6 rounded-md bg-cyan-600 text-white flex items-center justify-center text-xs">H</span>
                            <span>HyperScale</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
