"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Clock,
    Eye,
    MessageSquare,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateNoteModal from "@/components/modal/create-note-modal";
import ScheduleInterviewButton from "./schedule-interview-button";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { useHasPermission } from "@/lib/use-permission";
import type { MentionUser } from "@/components/mentions-text-area";

export type ReviewStage = {
    id: number;
    stage_name: string | null;
    stage_order_id: number | null;
    color: string | null;
};

type Props = {
    applicationId: number;
    candidateId: number;
    jobId: number | null;
    jobName: string;
    department: string;
    stages: ReviewStage[];
    currentStageName: string | null;
    /** The get_application_by_id row, for the schedule modal. The row is
     * not an ApplicationResponseType (it has no assign_to), and the modal
     * only reads id / job_id / candidate name & email from it. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    application: any;
    users: MentionUser[];
};

const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

const REJECTION_ICONS = [AlertCircle, CheckCircle, Clock, XCircle];

/**
 * Header controls for the review page. Permission checks here are
 * UX-only — the server actions remain the real gate.
 *
 * Reject has no dedicated action or "Rejected" stage: it sets the
 * candidate status to REJECTED via update_candidate_action and records
 * the reason as a NEGATIVE candidate note, so the decision is visible
 * in the Notes & Feedback history.
 */
const ReviewHeaderActions = ({
    applicationId,
    candidateId,
    jobName,
    department,
    stages,
    currentStageName,
    application,
    users,
}: Props) => {
    const router = useRouter();
    const hasPermission = useHasPermission();
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const noteWasOpen = useRef(false);

    // A note added from the header shows up in the Notes tab — refresh
    // once the modal closes so the history is current.
    useEffect(() => {
        if (noteWasOpen.current && !isNoteOpen) router.refresh();
        noteWasOpen.current = isNoteOpen;
    }, [isNoteOpen, router]);

    const canMove = hasPermission("application:move");
    const canEdit = hasPermission("candidate:edit");
    const canSchedule = hasPermission("interview:schedule");

    const sortedStages = [...stages].sort(
        (a, b) => (a.stage_order_id ?? Number.MAX_SAFE_INTEGER) - (b.stage_order_id ?? Number.MAX_SAFE_INTEGER),
    );

    const handleAdvance = async (stageId: number, stageName: string | null) => {
        setError(null);
        setConfirmation(null);
        setIsBusy(true);
        try {
            const result = await update_application_stage_action({
                applicationId,
                new_stage_id: stageId,
            });
            if (result && typeof result === "object" && "error" in result && result.error) {
                setError(
                    (result as { message?: string }).message ??
                        "Failed to move the application",
                );
                return;
            }
            setConfirmation(
                stageName ? `Moved to ${stageName}` : "Application stage updated",
            );
            router.refresh();
        } catch (err) {
            setError((err as Error).message || "Failed to move the application");
        } finally {
            setIsBusy(false);
        }
    };

    const handleReject = async (reason: string) => {
        setError(null);
        setConfirmation(null);
        setIsBusy(true);
        try {
            const result = await update_candidate_action({
                id: candidateId,
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
                note_id: `candidate_${candidateId}`,
                note_type: "candidate",
                candidate_id: candidateId,
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
                router.refresh();
                return;
            }
            if (typeof noteResult === "string" && noteResult.startsWith("Failed")) {
                setError("Candidate rejected, but the rejection note could not be saved");
                router.refresh();
                return;
            }
            setConfirmation(`Candidate rejected: ${reason}`);
            router.refresh();
        } catch (err) {
            setError((err as Error).message || "Failed to reject the candidate");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
                {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setIsNoteOpen(true)}>
                        <MessageSquare size={16} className="mr-2" />
                        Add Note
                    </Button>
                )}
                {canSchedule && (
                    <ScheduleInterviewButton
                        application={application}
                        jobName={jobName}
                        department={department}
                        variant="outline"
                        size="sm"
                    />
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2" disabled={!canMove || isBusy}>
                            <CheckCircle size={16} />
                            <span>Advance</span>
                            <ChevronDown size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {sortedStages.length > 0 ? (
                            sortedStages.map((stage) => (
                                <DropdownMenuItem
                                    key={stage.id}
                                    disabled={stage.stage_name === currentStageName}
                                    onClick={() => handleAdvance(stage.id, stage.stage_name)}
                                >
                                    <Eye size={16} className="mr-2" />
                                    Move to {stage.stage_name ?? `Stage ${stage.id}`}
                                </DropdownMenuItem>
                            ))
                        ) : (
                            <DropdownMenuItem disabled>No stages for this job</DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="destructive" className="gap-2" disabled={!canEdit || isBusy}>
                            <XCircle size={16} />
                            <span>Reject</span>
                            <ChevronDown size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {REJECTION_REASONS.map((reason, index) => {
                            const Icon = REJECTION_ICONS[index];
                            return (
                                <DropdownMenuItem key={reason} onClick={() => handleReject(reason)}>
                                    <Icon size={16} className="mr-2" />
                                    {reason}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {error && (
                <p className="flex items-start gap-1 text-xs text-red-600 max-w-sm text-right">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                </p>
            )}
            {confirmation && !error && (
                <p className="flex items-start gap-1 text-xs text-green-600 max-w-sm text-right">
                    <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    {confirmation}
                </p>
            )}
            <CreateNoteModal
                parent_id={candidateId}
                parent_type="candidate"
                isOpen={isNoteOpen}
                setIsOpen={setIsNoteOpen}
                candidate_id={candidateId}
                users={users}
            />
        </div>
    );
};

export default ReviewHeaderActions;
