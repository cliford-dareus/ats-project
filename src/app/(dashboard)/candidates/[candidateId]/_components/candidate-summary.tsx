"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import { Calendar, FileText, Mail, Phone, XCircle } from "lucide-react";
import { CandidateWithDetails, NoteType } from "@/types";
import { format} from "date-fns";
import InternalNoteSection from '@/components/internal-note-section';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { useHasPermission } from "@/lib/use-permission";

type Props = {
    data: CandidateWithDetails;
    softSkills: string[];
    technicalSkills: string[];
    resumeSummary: string;
    /** Candidate notes already fetched server-side (get_candidate_notes). */
    candidateNotes?: NoteType[];
};

const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

/**
 * Reject follows the review page's pattern: set the candidate status to
 * REJECTED via update_candidate_action (server-gated on candidate:edit,
 * org-scoped to the session org) and record the chosen reason as a
 * NEGATIVE candidate note, so the decision shows up in the notes below.
 * There is no interview-scheduling entry point on this page — the old
 * dead "Schedule Interview" button was removed (see B39/B40 follow-up).
 */
const CandidateSummary = ({ data, softSkills, technicalSkills, resumeSummary, candidateNotes }: Props) => {
    const candidate = data.candidate;
    const router = useRouter();
    const hasPermission = useHasPermission();
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [notesVersion, setNotesVersion] = useState(0);

    const canEdit = hasPermission("candidate:edit");
    const isRejected = candidate.status === "REJECTED";
    const hasSkills = technicalSkills.length > 0 || softSkills.length > 0;

    const handleReject = async (reason: string) => {
        setError(null);
        setConfirmation(null);
        setIsBusy(true);
        try {
            const result = await update_candidate_action({
                id: candidate.id,
                status: "REJECTED",
            });
            if (result && typeof result === "object" && "error" in result && result.error) {
                setError(
                    (result as { message?: string }).message ??
                        "Failed to reject the candidate",
                );
                return;
            }
            const noteResult = await create_note({
                text: `Rejected: ${reason}`,
                note_id: `candidate_${candidate.id}`,
                note_type: "candidate",
                candidate_id: candidate.id,
                type: "NEGATIVE",
                mentions: [],
            });
            if (
                noteResult &&
                typeof noteResult === "object" &&
                "error" in noteResult &&
                noteResult.error
            ) {
                setError(
                    (noteResult as { message?: string }).message ??
                        "Candidate rejected, but the rejection note could not be saved",
                );
                setNotesVersion((v) => v + 1);
                router.refresh();
                return;
            }
            if (typeof noteResult === "string" && noteResult.startsWith("Failed")) {
                setError("Candidate rejected, but the rejection note could not be saved");
                setNotesVersion((v) => v + 1);
                router.refresh();
                return;
            }
            setConfirmation(`Candidate rejected: ${reason}`);
            setNotesVersion((v) => v + 1);
            router.refresh();
        } catch (err) {
            setError((err as Error).message || "Failed to reject the candidate");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Bio */}
            <div className="lg:col-span-2 space-y-6">

                {/* Bio & Resume Summary */}
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-brand-dark uppercase tracking-widest">
                        <FileText className="w-5 h-5 text-brand-600" />
                        Candidate Summary & Background
                    </h3>

                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                        {resumeSummary || "No summary available"}
                    </p>

                    {hasSkills ? (
                        <>
                            {technicalSkills.length > 0 && (
                                <div className="pt-4 border-t border-border">
                                    <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Top Technical Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {technicalSkills.map((skill) => (
                                            <span key={skill} className="px-3 py-1.5 bg-brand-50 border border-brand-200/60 rounded-xl text-xs font-bold text-brand-800">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {softSkills.length > 0 && (
                                <div className="pt-3">
                                    <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Soft Skills & Capabilities</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {softSkills.map((sSkill) => (
                                            <span key={sSkill} className="px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-bold text-foreground">
                                                {sSkill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground pt-4 border-t border-border">No skills listed</p>
                    )}
                </div>

            </div>

            {/* Right Column: Contact Card & Quick Info */}
            <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-5">
                    <h3 className="font-bold text-base text-foreground tracking-tight pb-3 border-b border-border">
                        Contact Details
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center border border-border text-muted-foreground">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Email Address</p>
                                <p className="text-xs font-bold text-foreground">{candidate.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center border border-border text-muted-foreground">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Phone Number</p>
                                <p className="text-xs font-bold text-foreground">{candidate.phone || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-2xl flex items-center justify-center border border-border text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Applied On</p>
                                <p className="text-xs font-bold text-foreground">{format(candidate.created_at, 'MM/dd/yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    {canEdit && !isRejected && (
                        <div className="pt-4 border-t border-border space-y-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold transition-all"
                                        disabled={isBusy}
                                    >
                                        <XCircle size={16} className="mr-2" />
                                        Reject Candidate
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {REJECTION_REASONS.map((reason) => (
                                        <DropdownMenuItem key={reason} onClick={() => handleReject(reason)}>
                                            {reason}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {error && (
                                <p className="text-xs text-red-600">{error}</p>
                            )}
                            {confirmation && !error && (
                                <p className="text-xs text-green-600">{confirmation}</p>
                            )}
                        </div>
                    )}
                    {isRejected && (
                        <p className="pt-4 border-t border-border text-xs font-bold text-rose-700">Candidate rejected</p>
                    )}
                </div>

                <InternalNoteSection
                    parent_type="candidate"
                    parent_id={candidate.id}
                    selectedId={candidate.id}
                    candidate_id={candidate.id}
                    entityType="candidate"
                    initialNotes={candidateNotes}
                    refreshSignal={notesVersion}
                />
            </div>

        </div>
    );
};

export default CandidateSummary;
