"use client";

import React, { useState } from 'react';
import {
    Calendar,
    MessageSquare,
    Video,
} from "lucide-react";
import { CandidateWithDetails } from "@/types";
import type { ScoreCardRow } from "@/server/queries/drizzle/score-cards";
import { format } from "date-fns";
import ScheduleInterviewButton from "@/app/(dashboard)/applications/[applicationId]/review/[candidateId]/_components/schedule-interview-button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useHasPermission } from "@/lib/use-permission";

/** One schedulable application for this candidate, resolved in the page
 * loader: the get_application_by_id row (id / job_id / candidate name &
 * email — the shape ScheduleInterviewModal reads) plus the job name and
 * department the button needs. Only applications on OPEN jobs are
 * offered; anything else gets no button, not a dead one. */
export type CandidateScheduleOption = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    application: any;
    jobName: string;
    department: string;
};

type Props = {
    // get_candidate_by_id_db returns `scoreCards` (ScoreCardRow[]) alongside
    // the interviews, but CandidateWithDetails predates it (it still
    // declares the stale `scoreCard: string[]` key) — typed locally here
    // instead of editing the shared type (see report).
    data: CandidateWithDetails & { scoreCards?: ScoreCardRow[] };
    /** Schedulable (OPEN-job) applications, resolved in the page loader. */
    scheduleOptions?: CandidateScheduleOption[];
    /** Interviewer display names by interview id, resolved in the page
     * loader via db_get_org_members_by_ids. Only ids that resolve to a
     * real org member appear — a name is never invented. */
    interviewerNames?: Record<number, string[]>;
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

const CandidateInterviews = ({ data, scheduleOptions = [], interviewerNames = {} }: Props) => {
    const hasPermission = useHasPermission();
    const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
    const interview = data.interview ?? [];
    const scoreCards = data.scoreCards ?? [];

    // Schedule entry point (review page gates the same way: the button is
    // UX-gated on interview:schedule; the interview server actions are
    // the real gate). One open application schedules against it directly;
    // several offer a role select; none means no button at all.
    const canSchedule = hasPermission("interview:schedule");
    const selectedOption =
        scheduleOptions.find((option) => String(option.application.id) === selectedApplicationId)
        ?? scheduleOptions[0];
    const scheduleSection = canSchedule && scheduleOptions.length > 0 && selectedOption ? (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-foreground mr-auto">
                Schedule an interview for this candidate
            </p>
            {scheduleOptions.length > 1 && (
                <Select
                    value={String(selectedOption.application.id)}
                    onValueChange={setSelectedApplicationId}
                >
                    <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {scheduleOptions.map((option) => (
                            <SelectItem
                                key={option.application.id}
                                value={String(option.application.id)}
                            >
                                {option.department
                                    ? `${option.jobName} · ${option.department}`
                                    : option.jobName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <ScheduleInterviewButton
                application={selectedOption.application}
                jobName={selectedOption.jobName}
                department={selectedOption.department}
            />
        </div>
    ) : null;

    if (interview.length === 0 && scoreCards.length === 0) {
        return (
            <div className="space-y-8 flex flex-col">
                {scheduleSection}
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-6">
                    <div className="text-center py-12 bg-muted/80 rounded-xl border border-dashed border-border space-y-3">
                        <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-bold text-foreground">No interviews currently scheduled</p>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-8 flex flex-col">
            {scheduleSection}
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
                            {(interviewerNames[item.id] ?? []).length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Interviewer: {interviewerNames[item.id].join(", ")}
                                </p>
                            )}
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
