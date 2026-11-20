import React from 'react';
import {
    Download,
    FileText
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import { format} from "date-fns";

type Props = {
    data: CandidateWithDetails;
    resumeSummary: string;
};

const CandidateDocuments = ({ data, resumeSummary }: Props) => {
    const candidate = data.candidate;

    return (
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-bold text-foreground text-brand-dark uppercase tracking-widest">Attached Documents & Resume</h3>
                <button
                    onClick={() => alert("Simulating PDF download...")}
                    className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download Original Resume
                </button>
            </div>

            <div className="p-6 bg-muted rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{candidate.name}_Resume_2026.pdf</p>
                        <p className="text-xs text-muted-foreground font-medium">Parsed on {format(candidate.created_at, 'MM/dd/yyyy')} • PDF Document</p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border text-xs text-muted-foreground leading-relaxed font-mono">
                    {resumeSummary || "Resume parsing summary details generated for this candidate."}
                </div>
            </div>
        </div>
    );
};

export default CandidateDocuments;
