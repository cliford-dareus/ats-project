"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateNoteModal from "@/components/modal/create-note-modal";
import type { MentionUser } from "@/components/mentions-text-area";
import type { NoteType } from "@/types";
import type { ScoreCardRow } from "@/server/queries/drizzle/score-cards";

type Props = {
    candidateId: number;
    users: MentionUser[];
    notes: NoteType[];
    scoreCards: ScoreCardRow[];
};

const RECOMMENDATION_LABELS: Record<string, string> = {
    DEFINITELY_NO: "Definitely no",
    NO: "No",
    YES: "Yes",
    STRONG_YES: "Strong yes",
    NO_DECISION: "No decision",
};

const DECISION_LABELS: Record<string, string> = {
    "ADVANCE IMMEDIATELY": "Advance immediately",
    "REJECT IMMEDIATELY": "Reject immediately",
    NO_DECISION: "No decision yet",
};

function format_date(value: Date | string | null | undefined): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
}

type HistoryItem =
    | { kind: "note"; createdAt: Date | string | null; note: NoteType }
    | { kind: "scorecard"; createdAt: Date | string | null; scoreCard: ScoreCardRow };

/**
 * Notes tab: an Add Note button (CreateNoteModal) plus the combined
 * history of real candidate notes and real interview scorecards,
 * labelled distinctly and newest first.
 */
const ReviewNotesTab = ({ candidateId, users, notes, scoreCards }: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const wasOpen = useRef(false);

    // A note added here shows in the history below — refresh once the
    // modal closes so it appears without a manual reload.
    useEffect(() => {
        if (wasOpen.current && !isOpen) router.refresh();
        wasOpen.current = isOpen;
    }, [isOpen, router]);

    const history: HistoryItem[] = [
        ...notes.map((note): HistoryItem => ({ kind: "note", createdAt: note.created_at, note })),
        ...scoreCards.map((scoreCard): HistoryItem => ({
            kind: "scorecard",
            createdAt: scoreCard.created_at,
            scoreCard,
        })),
    ].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Note */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus size={20} />
                        Add New Note
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Leave an internal note about this candidate. Type @ in the
                        composer to mention a teammate.
                    </p>
                    <Button onClick={() => setIsOpen(true)}>
                        <MessageSquare size={16} className="mr-2" />
                        Add Note
                    </Button>
                </CardContent>
            </Card>

            {/* Notes History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare size={20} />
                        Notes & Feedback
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {history.length > 0 ? (
                            history.map((item, index) =>
                                item.kind === "note" ? (
                                    <div
                                        key={`note-${item.note._id ?? index}`}
                                        className="border-l-4 border-zinc-300 pl-4 py-2"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-medium text-sm">
                                                Note · {item.note.author || "Unknown"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format_date(item.note.created_at)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-foreground">{item.note.text}</p>
                                        {item.note.type && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {item.note.type}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        key={`scorecard-${item.scoreCard.id}`}
                                        className="border-l-4 border-blue-500 pl-4 py-2"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-medium text-sm">
                                                Interview feedback · {item.scoreCard.interviewer}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format_date(item.scoreCard.created_at)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-foreground">
                                            Recommendation:{" "}
                                            {item.scoreCard.overall_recommendations
                                                ? RECOMMENDATION_LABELS[
                                                      item.scoreCard.overall_recommendations
                                                  ] ?? item.scoreCard.overall_recommendations
                                                : "Not scored"}
                                        </p>
                                        {item.scoreCard.decision && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Decision:{" "}
                                                {DECISION_LABELS[item.scoreCard.decision] ??
                                                    item.scoreCard.decision}
                                            </p>
                                        )}
                                        {(item.scoreCard.interview_start_at ||
                                            item.scoreCard.interview_type) && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {[
                                                    format_date(item.scoreCard.interview_start_at),
                                                    item.scoreCard.interview_type,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>
                                        )}
                                        {item.scoreCard.feedback && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {item.scoreCard.feedback}
                                            </p>
                                        )}
                                    </div>
                                ),
                            )
                        ) : (
                            <div className="text-center py-8">
                                <MessageSquare size={32} className="mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No notes or feedback yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Add the first note to start tracking feedback
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <CreateNoteModal
                parent_id={candidateId}
                parent_type="candidate"
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                candidate_id={candidateId}
                users={users}
            />
        </div>
    );
};

export default ReviewNotesTab;
