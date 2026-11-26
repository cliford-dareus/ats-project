"use client";

import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import InterviewFeedbackModal, {
    type FeedbackInterview,
} from "@/components/modal/interview-feedback-modal";
import { can_submit_interview_feedback } from "@/lib/interview-status";
import { useHasPermission } from "@/lib/use-permission";
import type { ScoreCardRow } from "@/server/queries/drizzle/score-cards";

type Props = {
    interview: FeedbackInterview;
    candidateName: string;
    jobName: string;
    existing?: ScoreCardRow | null;
};

/**
 * Per-interview feedback button + modal. Only rendered when feedback is
 * meaningful for the interview's derived status (never for a dead hold)
 * and the viewer holds candidate:evaluate — the server action is the
 * real gate; this is UX-only.
 */
const InterviewFeedbackButton = ({
    interview,
    candidateName,
    jobName,
    existing,
}: Props) => {
    const hasPermission = useHasPermission();
    const [isOpen, setIsOpen] = useState(false);

    if (!can_submit_interview_feedback(interview)) return null;
    if (!hasPermission("candidate:evaluate")) return null;

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <MessageSquare size={16} className="mr-2" />
                {existing ? "Edit feedback" : "Submit feedback"}
            </Button>
            <InterviewFeedbackModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                interview={interview}
                candidateName={candidateName}
                jobName={jobName}
                existing={existing}
            />
        </>
    );
};

export default InterviewFeedbackButton;
