import React from 'react';
import {
    Calendar,
    Video,
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format} from "date-fns";

type Props = {
    data: CandidateWithDetails;
};

const CandidateInterviews = ({ data }: Props) => {
    console.log(data);
    const interview = data.interview || [];

    if (interview.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                <div className="text-center py-12 bg-zinc-50/80 rounded-xl border border-dashed border-zinc-200 space-y-3">
                    <Calendar className="w-10 h-10 text-zinc-300 mx-auto" />
                    <p className="text-sm font-bold text-zinc-700">No interviews currently scheduled</p>
                    <button
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                    >
                        Book Evaluation Session
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-8 flex flex-col">
            {interview.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                        <div>
                            <h3 className="font-bold text-zinc-900 text-brand-dark uppercase tracking-widest">Interview Management</h3>
                            <p className="text-xs text-zinc-500">Track and schedule evaluation calls with candidate</p>
                        </div>

                        <button
                            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-brand-500/20"
                        >
                            <Calendar className="w-4 h-4" />
                            Schedule New Interview
                        </button>
                    </div>


                    <div className="p-6 bg-primary-50/60 border border-primary-200/80 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-primary-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                                {item.status} Interview
                            </span>
                            <span className="text-xs font-bold text-zinc-500">
                                {format(item.date, 'MM/dd/yyyy')} at {format(item.time, 'HH:mm')}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-bold text-zinc-900">Format: {item.type} Meeting</p>
                            {item.link && (
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all mt-2"
                                >
                                    <Video className="w-4 h-4 text-emerald-400" />
                                    Join Google Meet / Video Link
                                </a>
                            )}
                        </div>
                    </div>

                </div>
            ))}
        </div>

    );
};

export default CandidateInterviews;
