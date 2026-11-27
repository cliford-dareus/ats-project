"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ApplicationResponseType, StageResponseType } from "@/types";
import { AlertCircle, CheckCircle, ChevronDown, Clock, MessageSquare, UserCheck, UserX, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { update_candidate_action } from "@/server/actions/candidates-actions";
import { create_note } from "@/server/queries/mongo/note";
import { useHasPermission } from "@/lib/use-permission";

type Props = {
    applicationResult: ApplicationResponseType;
    stages: StageResponseType[];
}

/** Initials derived from the candidate's real name (B22-4). */
const getInitials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("") || "?";

const REJECTION_REASONS = [
    "Not qualified",
    "Position filled",
    "No response",
    "Other",
] as const;

const REJECTION_ICONS = [AlertCircle, CheckCircle, Clock, XCircle];

const AppicationHeader = ({ applicationResult, stages }: Props) => {
    const router = useRouter();
    const hasPermission = useHasPermission();
    const canMove = hasPermission("application:move");
    const canEditCandidate = hasPermission("candidate:edit");
    const [, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<string | null>(null);

    // B22-1: Advance was an empty stub. The `stages` prop is already the
    // job-scoped stage list for this application (loaded by job id on the
    // detail page), so resolve the target stage from it — never by name
    // alone across jobs (S-1) — then call the stage action, which verifies
    // server-side that the stage belongs to the application's job (S-2).
    const moveToStage = async (stageName: string) => {
        const targetStage = stages.find((stage) => stage.stage_name === stageName);
        if (!targetStage) {
            setError("Stage not found for this job");
            return;
        }
        startTransition(async () => {
            try {
                setError(null);
                setConfirmation(null);
                const result = await update_application_stage_action({
                    applicationId: applicationResult.id,
                    new_stage_id: targetStage.id,
                });
                if (result && typeof result === "object" && "error" in result && result.error) {
                    setError(
                        (result as { message?: string }).message ??
                            "Failed to move the application",
                    );
                    return;
                }
                setConfirmation(`Moved to ${stageName}`);
                router.refresh();
            } catch (err) {
                setError((err as Error).message || "Failed to move the application");
            }
        });
    };

    // B22-3: Reject reuses the established review-page pattern — candidate
    // status REJECTED plus a NEGATIVE "Rejected: <reason>" note.
    const handleReject = async (reason: string) => {
        setError(null);
        setConfirmation(null);
        try {
            const result = await update_candidate_action({
                id: applicationResult.candidate_id,
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
                note_id: `candidate_${applicationResult.candidate_id}`,
                note_type: "candidate",
                candidate_id: applicationResult.candidate_id,
                type: "NEGATIVE",
                mentions: [],
            });
            if (
                (noteResult && typeof noteResult === "object" && "error" in noteResult && noteResult.error) ||
                (typeof noteResult === "string" && noteResult.startsWith("Failed"))
            ) {
                setError("Candidate rejected, but the rejection note could not be saved");
                router.refresh();
                return;
            }
            setConfirmation(`Candidate rejected: ${reason}`);
            router.refresh();
        } catch (err) {
            setError((err as Error).message || "Failed to reject the candidate");
        }
    };

    return (
        <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                        <AvatarFallback>{getInitials(applicationResult.candidate_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground leading-tight uppercase">{applicationResult.candidate_name}</h2>
                        <p className="text-sm text-muted-foreground font-medium">
                            Applying for <span
                                className="text-primary font-bold uppercase">{applicationResult.job_apply}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <a
                    href={`mailto:${applicationResult.candidate_email}`}
                    className="px-4 !py-2 border border-border rounded-lg text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2"
                >
                    <MessageSquare size={14} />
                    Message
                </a>

                <div className="flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-l-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                                <UserCheck size={14} />
                                Advance
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup
                                value={applicationResult?.current_stage as string}
                                onValueChange={moveToStage}
                            >
                                <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {stages.map((stage) => (
                                    <DropdownMenuRadioItem
                                        value={stage.stage_name as string}
                                        key={stage.id}
                                        disabled={!canMove}
                                        className={cn(
                                            "cursor-pointer",
                                            applicationResult.current_stage === stage.stage_name
                                                ? "bg-accent text-accent-foreground"
                                                : "",
                                        )}
                                    >
                                        {stage.stage_name}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-r-lg uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-colors">
                                <UserX size={14} />
                                Reject
                                <ChevronDown size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {REJECTION_REASONS.map((reason, index) => {
                                const Icon = REJECTION_ICONS[index];
                                return (
                                    <DropdownMenuItem
                                        key={reason}
                                        disabled={!canEditCandidate}
                                        onClick={() => handleReject(reason)}
                                    >
                                        <Icon size={16} className="mr-2" />
                                        {reason}
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
            {error && (
                <p className="flex items-start gap-1 text-xs text-red-600 max-w-sm self-end">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                </p>
            )}
            {confirmation && !error && (
                <p className="flex items-start gap-1 text-xs text-green-600 max-w-sm self-end">
                    <CheckCircle size={14} className="mt-0.5 shrink-0" />
                    {confirmation}
                </p>
            )}
        </div>
    );
};

export default AppicationHeader;
