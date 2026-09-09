"use client";

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface CtaProps {
    onOpenDemo: (mode?: 'demo' | 'trial', email?: string) => void;
}

export const Cta: React.FC<CtaProps> = ({ onOpenDemo }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onOpenDemo('trial', email);
    };

    return (
        <section className="py-20 md:py-28 bg-[#101b14] text-white relative overflow-hidden">
            {/* Decorative ambient background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-600/20 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Transform Your Hiring Pipeline Today</span>
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 max-w-3xl mx-auto leading-tight">
                    Hiring should move as fast as the rest of your company.
                </h2>

                <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Join hundreds of small and mid-sized teams screening resumes automatically, eliminating interview double-bookings, and making offers in days—not months.
                </p>

                {/* Rapid signup form */}
                <form
                    onSubmit={handleSubmit}
                    className="max-w-md mx-auto flex flex-col sm:flex-row items-center gap-2.5 mb-6"
                >
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your work email..."
                        required
                        className="w-full sm:flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition-all"
                    />
                    <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-98"
                    >
                        <span>Start Free</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-200/70 font-medium">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 14-day free trial
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No credit card required
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Full team access included
                    </span>
                </div>
            </div>
        </section>
    );
};
