"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submit_interview_feedback_action } from "@/server/actions/interview-feedback-actions";
import type { ScoreCardRow } from "@/server/queries/drizzle/score-cards";

export type InterviewFeedbackDecision =
    | "ADVANCE IMMEDIATELY"
    | "REJECT IMMEDIATELY"
    | "NO_DECISION";

export type InterviewFeedbackRecommendation =
    | "DEFINITELY_NO"
    | "NO"
    | "YES"
    | "STRONG_YES"
    | "NO_DECISION";

export type FeedbackInterview = {
    id: number;
    start_at: Date | string | null;
    end_at: Date | string | null;
    type: string | null;
    locations: string;
    status: string | null;
    hold_status: string | null;
};

type Props = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    interview: FeedbackInterview;
    candidateName: string;
    jobName: string;
    existing?: ScoreCardRow | null;
};

const RECOMMENDATIONS: {
    value: InterviewFeedbackRecommendation;
    label: string;
}[] = [
    { value: "DEFINITELY_NO", label: "Definitely no" },
    { value: "NO", label: "No" },
    { value: "YES", label: "Yes" },
    { value: "STRONG_YES", label: "Strong yes" },
];

const DECISIONS: { value: InterviewFeedbackDecision; label: string }[] = [
    { value: "ADVANCE IMMEDIATELY", label: "Advance immediately" },
    { value: "REJECT IMMEDIATELY", label: "Reject immediately" },
    { value: "NO_DECISION", label: "No decision yet" },
];

function format_interview_datetime(value: Date | string | null): string {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not scheduled";
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

const InterviewFeedbackModal = ({
    isOpen,
    setIsOpen,
    interview,
    candidateName,
    jobName,
    existing,
}: Props) => {
    const router = useRouter();
    const [recommendation, setRecommendation] =
        useState<InterviewFeedbackRecommendation>("NO_DECISION");
    const [decision, setDecision] =
        useState<InterviewFeedbackDecision>("NO_DECISION");
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill from the existing scorecard when editing; reset when the
    // dialog opens for a fresh submission.
    useEffect(() => {
        if (!isOpen) return;
        setRecommendation(existing?.overall_recommendations ?? "NO_DECISION");
        setDecision(existing?.decision ?? "NO_DECISION");
        setFeedback(existing?.feedback ?? "");
        setError(null);
    }, [isOpen, existing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await submit_interview_feedback_action({
                interviewId: interview.id,
                decision,
                overallRecommendation: recommendation,
                feedback,
            });
            if ("error" in result && result.error) {
                setError(result.message ?? "Failed to submit feedback");
                return;
            }
            setIsOpen(false);
            router.refresh();
        } catch (err) {
            setError((err as Error).message || "Failed to submit feedback");
        } finally {
            setIsSubmitting(false);
        }
    };

    const description = [
        `${candidateName} · ${jobName}`,
        format_interview_datetime(interview.start_at),
        [interview.type, interview.locations].filter(Boolean).join(" · "),
    ]
        .filter(Boolean)
        .join(" — ");

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-4 max-w-xl">
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl uppercase">
                            {existing ? "Edit feedback" : "Submit feedback"}
                        </DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <fieldset>
                        <Label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                            Overall recommendation
                        </Label>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Overall recommendation">
                            {RECOMMENDATIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                        recommendation === option.value
                                            ? "border-zinc-900 bg-zinc-900 text-white"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="overallRecommendation"
                                        value={option.value}
                                        checked={recommendation === option.value}
                                        onChange={() => setRecommendation(option.value)}
                                        className="sr-only"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset>
                        <Label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1">
                            Decision
                        </Label>
                        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Decision">
                            {DECISIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                        decision === option.value
                                            ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="decision"
                                        value={option.value}
                                        checked={decision === option.value}
                                        onChange={() => setDecision(option.value)}
                                        className="accent-zinc-900"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div>
                        <Label
                            htmlFor="interview-feedback-text"
                            className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-1"
                        >
                            Feedback
                        </Label>
                        <Textarea
                            id="interview-feedback-text"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="What went well? What concerns you? Share your assessment of this candidate..."
                            className="min-h-[120px]"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-3 bg-zinc-50 text-zinc-600 rounded-xl font-bold hover:bg-zinc-100 transition-all"
                        >
                            Cancel
                        </button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Saving…"
                                : existing
                                  ? "Save changes"
                                  : "Submit feedback"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InterviewFeedbackModal;
