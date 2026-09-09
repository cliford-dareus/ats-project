"use client";

import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

const PLANS = [
    {
        name: "Starter",
        price: "$0",
        period: "forever",
        description: "For small teams trying modern ATS workflows.",
        cta: "Get started",
        href: "/sign-up",
        highlighted: false,
        features: [
            "1 organization",
            "Up to 3 open jobs",
            "Career page subdomain",
            "Basic pipeline stages",
            "Email templates",
        ],
    },
    {
        name: "Pro",
        price: "$49",
        period: "per month",
        description: "For growing teams that hire every week.",
        cta: "Start Pro trial",
        href: "/sign-up",
        highlighted: true,
        features: [
            "Unlimited jobs",
            "AI resume scoring",
            "Automations & triggers",
            "Team roles & mentions",
            "Reports & exports",
            "Priority support",
        ],
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "Security, SSO, and volume for larger orgs.",
        cta: "Contact sales",
        href: "/contact",
        highlighted: false,
        features: [
            "Everything in Pro",
            "SSO / advanced roles",
            "Custom integrations",
            "Dedicated support",
            "SLA options",
        ],
    },
];

const PricingPage = () => {
    const [annual, setAnnual] = useState(true);
    return (
        <section id="pricing" className="py-16 md:py-24 bg-white border-b border-[#e8e6dc]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Simple, honest pricing for growing teams.
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 mb-8">
                        No mandatory $10,000 implementation fees. No per-seat hiring manager penalties. Invite your entire engineering and leadership team for free.
                    </p>

                    {/* Billing Switcher */}
                    <div className="inline-flex items-center gap-3 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
                        <button
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!annual ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${annual ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <span>Annual Billing</span>
                            <span className="bg-emerald-800 text-emerald-100 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                Save 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Plan 1: Starter */}
                    <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-7 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-5">
                                Ideal for early startups with 1 to 3 active open positions.
                            </p>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    ${annual ? '79' : '99'}
                                </span>
                                <span className="text-xs font-medium text-slate-500">/ month</span>
                            </div>

                            <ul className="space-y-3 text-xs text-slate-700 mb-8">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Up to 3 active published job postings</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Visual drag-and-drop candidate pipeline</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Automated resume parsing (up to 150/mo)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Automated candidate email loops</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Free unlimited team members</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => onOpenDemo('trial')}
                            className="w-full py-3 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            Start 14-Day Free Trial
                        </button>
                    </div>

                    {/* Plan 2: Growth (Featured) */}
                    <div className="rounded-2xl border-2 border-emerald-600 bg-white p-7 flex flex-col justify-between shadow-xl relative scale-100 lg:scale-105 z-10">
                        {/* Badge */}
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Most Popular for SMBs</span>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Growth</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-5">
                                For fast-growing 15–150 person teams hiring continuously.
                            </p>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    ${annual ? '199' : '249'}
                                </span>
                                <span className="text-xs font-medium text-slate-500">/ month</span>
                            </div>

                            <ul className="space-y-3 text-xs text-slate-700 mb-8">
                                <li className="flex items-center gap-2 font-semibold text-slate-900">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Unlimited active job postings</span>
                                </li>
                                <li className="flex items-center gap-2 font-semibold text-slate-900">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Automated AI Screening & Custom Rubrics</span>
                                </li>
                                <li className="flex items-center gap-2 font-semibold text-slate-900">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Smart Calendar Holds (Google & Outlook sync)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>1-Click Multi-Board Job Syndication</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Hosted Branded Careers Portal</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Slack & Teams Hiring Loop Bots</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Bias Shield Mode (EEOC Blind Review)</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <span>Get Started with Growth</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Plan 3: Scale */}
                    <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-7 flex flex-col justify-between hover:border-slate-300 transition-all">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Scale</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-5">
                                For established organizations (150–500 staff) with multi-team hiring.
                            </p>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    ${annual ? '399' : '499'}
                                </span>
                                <span className="text-xs font-medium text-slate-500">/ month</span>
                            </div>

                            <ul className="space-y-3 text-xs text-slate-700 mb-8">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Everything in Growth, unlimited</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Multi-brand & subsidiary careers pages</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>HRIS / Payroll sync (Rippling, Gusto, Bamboo)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Custom RBAC & Department Permissions</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Dedicated Hiring Success Manager & SLA</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            className="w-full py-3 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            Talk to Sales & Migration
                        </button>
                    </div>
                </div>

                {/* Reassurance banner */}
                <div className="mt-12 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-6">
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        SOC2 Type II & GDPR Compliant
                    </span>
                    <span>•</span>
                    <span>No credit card required for trial</span>
                    <span>•</span>
                    <span>Cancel or change plans anytime</span>
                </div>
            </div>
        </section>
    );
};

export default PricingPage;
