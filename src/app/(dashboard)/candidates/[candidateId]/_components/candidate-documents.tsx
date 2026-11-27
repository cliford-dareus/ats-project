import React from 'react';
import {
    Download,
    Eye,
    FileText
} from "lucide-react";
import { CandidateWithDetails } from "@/types";

type AttachmentRow = {
    id: number;
    file_name: string;
    file_url: string;
    candidate_id: number;
    attachment_type: "RESUME" | "COVER_LETTER" | "OFFER_LETTER" | "OTHER" | null;
};

type Props = {
    // get_candidate_by_id_db returns `attachment` rows and `scoreCards`
    // alongside the candidate, but CandidateWithDetails predates them
    // (it still declares the stale `scoreCard: string[]` key) — the
    // extra fields are typed locally here instead of editing the shared
    // type (see report).
    data: CandidateWithDetails & { attachment?: AttachmentRow[] };
    resumeSummary: string;
};

const CandidateDocuments = ({ data, resumeSummary }: Props) => {
    const candidate = data.candidate;
    const attachments = data.attachment ?? [];

    // The resume lives in R2 under the cv_path key; the authenticated
    // route streams it (404 when none was uploaded). Legacy
    // `no-resume-...` placeholder keys and empty paths mean "no resume",
    // not a file. The displayed name is the stored key's basename —
    // never an invented filename.
    const hasResume = !!candidate.cv_path && !candidate.cv_path.startsWith("no-resume-");
    const resumeFileName = hasResume
        ? candidate.cv_path.split("/").pop() || "Resume"
        : null;

    return (
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="font-bold text-foreground text-brand-dark uppercase tracking-widest">Attached Documents & Resume</h3>
                {hasResume && (
                    <div className="flex items-center gap-2">
                        <a
                            href={`/api/candidates/${candidate.id}/resume?view=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-muted hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground transition-all flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            Preview Resume
                        </a>
                        <a
                            href={`/api/candidates/${candidate.id}/resume`}
                            className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download Original Resume
                        </a>
                    </div>
                )}
            </div>

            <div className="p-6 bg-muted rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        {hasResume ? (
                            <>
                                <p className="text-sm font-bold text-foreground">{resumeFileName}</p>
                                <p className="text-xs text-muted-foreground font-medium">PDF Document</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-foreground">No resume uploaded</p>
                        )}
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border text-xs text-muted-foreground leading-relaxed font-mono">
                    {resumeSummary || "No parsed summary available"}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-foreground text-brand-dark uppercase tracking-widest">Additional Attachments</h4>
                {attachments.length > 0 ? (
                    <div className="space-y-3">
                        {attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-muted/80 border border-border/60">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border text-muted-foreground shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-foreground truncate">{attachment.file_name}</p>
                                        {attachment.attachment_type && (
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{attachment.attachment_type}</p>
                                        )}
                                    </div>
                                </div>
                                <a
                                    href={`/api/attachments/${attachment.id}`}
                                    className="px-3 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all flex items-center gap-2 shrink-0"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">No additional attachments</p>
                )}
            </div>
        </div>
    );
};

export default CandidateDocuments;
