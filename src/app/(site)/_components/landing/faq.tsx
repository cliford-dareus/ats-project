"use client";

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: string;
}

export const Faq: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs: FaqItem[] = [
        {
            question: "How does aplico's automated screening work? Is it a black box?",
            answer:
                "Not at all. Unlike legacy AI screening that ranks candidates with mysterious opaque algorithms, aplico uses transparent rubrics set directly by your hiring team. You define the exact criteria (years of experience, required technical frameworks, domain background, specific answers). aplico extracts verified evidence from resumes and applications, providing a clear breakdown so you see exactly why someone scored 94% or 62%. You always maintain final human judgment.",
        },
        {
            question: "What are 'Interview Holds' and how do they eliminate double booking?",
            answer:
                "When an applicant advances to an interview round, aplico reserves 2–3 tentative calendar blocks across your interview panel's Google or Microsoft Outlook calendars. When the candidate selects their preferred window, that block confirms immediately, and all other holds are instantly released. Your engineers and managers never get booked over while candidates are deciding on a slot.",
        },
        {
            question: "How fast can we migrate our data from spreadsheets or our old ATS?",
            answer:
                "Most teams are completely live in under 15 minutes. We provide 1-click direct imports from Greenhouse, Lever, Ashby, Breezy, Workable, and standard CSV/Excel files. All your candidates, resumes, notes, and historical tags carry over automatically.",
        },
        {
            question: "Do you charge per seat for hiring managers and interviewers?",
            answer:
                "No! We believe that charging per user seat is the #1 reason enterprise ATSs fail—it creates perverse incentives where companies only buy 2 licenses and hiring managers never log in. On aplico, every plan includes unlimited hiring managers, interviewers, and team members at no extra cost.",
        },
        {
            question: "Where do our job postings get distributed?",
            answer:
                "With one click, your published job posts are automatically syndicated to LinkedIn Jobs, Indeed, Glassdoor, ZipRecruiter, and Google for Jobs. You also get a modern, high-speed branded careers portal (e.g., careers.yourcompany.com) that looks great on mobile and desktop.",
        },
        {
            question: "Is aplico compliant with EEOC, GDPR, and hiring regulations?",
            answer:
                "Yes. aplico includes a one-click 'Bias Shield' mode that anonymizes candidate names, photos, gender markers, and graduation dates to help teams conduct blind initial resume screening. We are fully GDPR compliant and SOC2 Type II certified.",
        },
    ];

    return (
        <section className="py-16 md:py-24 bg-white border-b border-[#e8e6dc]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold mb-3">
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Frequently Asked Questions</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Answers for discerning hiring teams.
                    </h2>
                    <p className="text-base text-slate-600">
                        Have questions about how aplico integrates with your existing workflow? Here is everything you need to know.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={idx}
                                className="rounded-xl border border-slate-200 bg-[#fbfaf6] overflow-hidden transition-colors"
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-emerald-800 transition-colors"
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''
                                            }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
