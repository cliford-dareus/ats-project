import React from 'react';
import {
    Calendar,
    MessageSquare,
    Video,
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import type { ScoreCardRow } from "@/server/queries/drizzle/score-cards";
import { format} from "date-fns";

type Props = {
    // get_candidate_by_id_db returns `scoreCards` (ScoreCardRow[]) alongside
    // the interviews, but CandidateWithDetails predates it (it still
    // declares the stale `scoreCard: string[]` key) — typed locally here
    // instead of editing the shared type (see report).
    data: CandidateWithDetails & { scoreCards?: ScoreCardRow[] };
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

const CandidateInterviews = ({ data }: Props) => {
    const interview = data.interview ?? [];
    const scoreCards = data.scoreCards ?? [];

    if (interview.length === 0 && scoreCards.length === 0) {
        return (
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                <div className="text-center py-12 bg-muted/80 rounded-xl border border-dashed border-border space-y-3">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm font-bold text-foreground">No interviews currently scheduled</p>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-8 flex flex-col">
            {interview.map((item, index) => (
                <div key={index} className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div>
                            <h3 className="font-bold text-foreground text-brand-dark uppercase tracking-widest">Interview Management</h3>
                            <p className="text-xs text-muted-foreground">Track and schedule evaluation calls with candidate</p>
                        </div>
                    </div>


                    <div className="p-6 bg-primary-50/60 border border-primary-200/80 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase tracking-wider">
                                {item.status} Interview
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                                {item.start_at
                                    ? `${format(item.start_at, 'MM/dd/yyyy')} at ${format(item.start_at, 'HH:mm')}`
                                    : "Date to be confirmed"}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-bold text-foreground">Format: {item.type} Meeting</p>
                            {item.link && (
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-foreground/90 transition-all mt-2"
                                >
                                    <Video className="w-4 h-4 text-emerald-400" />
                                    Join Google Meet / Video Link
                                </a>
                            )}
                        </div>
                    </div>

                </div>
            ))}

            {scoreCards.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                    <h3 className="font-bold text-foreground flex items-center gap-2 text-brand-dark uppercase tracking-widest">
                        <MessageSquare className="w-5 h-5 text-brand-600" />
                        Interview Feedback
                    </h3>
                    <div className="space-y-4">
                        {scoreCards.map((scoreCard) => (
                            <div key={scoreCard.id} className="border-l-4 border-blue-500 pl-4 py-2 space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="font-medium text-sm text-foreground">
                                        Interview feedback · {scoreCard.interviewer}
                                    </p>
                                    <p className="text-xs text-muted-foreground shrink-0">
                                        {format_date(scoreCard.created_at)}
                                    </p>
                                </div>
                                <p className="text-sm text-foreground">
                                    Recommendation:{" "}
                                    {scoreCard.overall_recommendations
                                        ? RECOMMENDATION_LABELS[scoreCard.overall_recommendations] ?? scoreCard.overall_recommendations
                                        : "Not scored"}
                                </p>
                                {scoreCard.decision && (
                                    <p className="text-sm text-muted-foreground">
                                        Decision: {DECISION_LABELS[scoreCard.decision] ?? scoreCard.decision}
                                    </p>
                                )}
                                {(scoreCard.interview_start_at || scoreCard.interview_type) && (
                                    <p className="text-xs text-muted-foreground">
                                        {[
                                            format_date(scoreCard.interview_start_at),
                                            scoreCard.interview_type,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                )}
                                {scoreCard.feedback && (
                                    <p className="text-sm text-muted-foreground">{scoreCard.feedback}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

    );
};

export default CandidateInterviews;
