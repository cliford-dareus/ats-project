"use client";

import Column from "@/components/kanban/column";
import { DragEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ApplicationType, StageResponseType } from "@/types";
import { useSocket } from "@/providers/socket-provider";
import { moveApplicationAndReorder } from "@/server/actions/application_actions";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import AutomationBuilder from "./automation-builder";
import { automationEngine } from "@/lib/automation-engine";
import {getJobAutomationRules} from "@/server/actions/plugin-actions";

interface ReorderPayload {
    applicationId: number;
    newStageId: number;
    targetOrders: CardOrder[];
    sourceStageId?: number;
    sourceOrders?: CardOrder[];
};

type CardOrder = { id: number; position: number };

type Props = {
    data: ApplicationType[];
    stages: StageResponseType[];
    jobDetails: { jobId: number, jobName: string, department: string }
};

const Kanban = ({ data, stages, jobDetails }: Props) => {
    const { socket } = useSocket();

    const [applications, setApplications] = useState<ApplicationType[]>(data);
    const [showTriggers, setShowTriggers] = useState(false);
    const [active, setActive] = useState(false);
    // Last failed drag/reorder, shown as a dismissible banner. There is no
    // app-wide toast library (the only toast in the codebase is a local
    // useState simulation on the landing page), so this uses the same
    // local-state pattern: visible, role="alert", auto-cleared.
    const [moveError, setMoveError] = useState<string | null>(null);
    const moveErrorTimer = useRef<number | null>(null);
    const showMoveError = (message: string) => {
        setMoveError(message);
        if (moveErrorTimer.current) window.clearTimeout(moveErrorTimer.current);
        moveErrorTimer.current = window.setTimeout(() => setMoveError(null), 8000);
    };
    useEffect(() => () => {
        if (moveErrorTimer.current) window.clearTimeout(moveErrorTimer.current);
    }, []);

    useEffect(() => {
        setApplications(data)
    }, [data]);

    useEffect(() => {
        const jobId = jobDetails.jobId;
        if (!jobId) return;
        getJobAutomationRules(jobId).then(rules => {
            automationEngine.loadJobRules(jobId, rules);
        });
    }, [jobDetails]);

    // ────────────────────────────────────────────────
    // Socket – handle external job completion
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !applications[0]?.job_id) return;

        socket.emit("join-board", applications[0]?.job_id);

        const onJobCompleted = async (data: any) => {
            const appId: number | undefined = data?.payload?.applicationId;
            const newStageName: string | undefined = data?.payload?.newStageName;
            if (!appId || !newStageName) return;

            const targetStage = stages.find((s) => s.stage_name === newStageName);
            if (!targetStage) return;

            // Snapshot outside setState for rollback
            let snapshot: ApplicationType[] | undefined;
            let payload: ReorderPayload | null = null;

            setApplications((prev) => {
                if (!prev) return prev;
                snapshot = prev.map((c) => ({ ...c }));

                const { updatedCards, payload: p } = computeReorder(
                    prev,
                    appId,
                    targetStage.stage_name!,
                    targetStage.id!,
                    null, // append to end on external move
                    stages
                );

                payload = p;
                return updatedCards;

            });

            // setState is async; wait a tick before reading payload
            await Promise.resolve();

            if (payload) {
                const result = await moveApplicationAndReorder(payload);
                if (!result.success) {
                    console.error("Socket move failed to sync; rolling back.");
                    if (snapshot) setApplications(snapshot);
                    showMoveError(result.error ?? "Couldn't move the application. Please try again.");
                }
            }
        };

        socket.on("job-completed", onJobCompleted);

        return () => {
            socket.off("job-completed", onJobCompleted);
        };
    }, [socket]);

    // ────────────────────────────────────────────────
    // Drag & Drop Logic
    // ────────────────────────────────────────────────
    const handleDrop = async (e: DragEvent<HTMLDivElement>, element: HTMLDivElement, stageId: number, column: typeof JOB_STAGES._type | null) => {
        e.preventDefault();
        setActive(false);
        const cardId = Number(e.dataTransfer.getData("cardId"));
        if (!cardId) return;

        const beforeId = Number(element?.dataset.before ?? -1);
        const dropStageId = Number(element?.dataset.stage ?? stageId);

        // Same position → no-op
        if (beforeId === cardId) return;

        // Snapshot for rollback on server failure
        const snapshot = applications.map((c) => ({ ...c }));

        const { updatedCards, payload } = computeReorder(
            applications,
            cardId,
            column!,           // this column is the drop target
            dropStageId,
            beforeId,
            stages
        );

        const isMove = snapshot.find((c) => c.id === cardId)?.stage !== column;

        // Optimistic update
        setApplications(updatedCards);

        if (isMove) {
            const result = await moveApplicationAndReorder(payload);

            if (!result.success) {
                // Roll back optimistic update and tell the user why.
                setApplications(snapshot);
                showMoveError(result.error ?? "Couldn't move the application. Please try again.");
                return;
            }

            const fromStage = snapshot.find((c) => c.id === cardId)?.stage ?? column!;
            const moved = snapshot.find((c) => c.id === cardId);
            // candidateId is the CANDIDATE id, applicationId the APPLICATION
            // id — never the same value. The server action re-resolves both
            // from the DB for the session org; user_id below is replaced by
            // the server action from the Clerk session and never trusted.
            await automationEngine.evaluate(
                {
                    type: "stage_changed",
                    candidateId: moved?.candidate?.id?.toString() ?? "",
                    applicationId: cardId,
                    fromStage: fromStage,
                    toStage: column!,
                },
                {
                    organization_id: applications[0]?.organization,
                    user_id: "",
                    job: { ...jobDetails, job_id: applications[0].job_id },
                    settings: {}
                }
            )

            // await fetchApplicationTasks();
        } else {
            // Same-column reorder: still persist the new order
            const result = await moveApplicationAndReorder(payload);
            if (!result.success) {
                setApplications(snapshot);
                showMoveError(result.error ?? "Couldn't reorder the applications. Please try again.");
            }
        }
    };

    // ──────────────────────────────────────────────
    // Derived state
    // ──────────────────────────────────────────────
    // Application by state
    const applicationsByStage = (stageId: number) => {
        return applications.filter((app) => app.current_stage_id === stageId).
            sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));
    };

    return (
        <div className="flex flex-col h-full w-full gap-4 overflow-x-scroll [&::-webkit-scrollbar]:hidden">
            {moveError && (
                <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive shrink-0">
                    <span>{moveError}</span>
                    <button type="button" onClick={() => setMoveError(null)} aria-label="Dismiss error" className="cursor-pointer hover:opacity-70 transition-opacity">
                        <X size={16} />
                    </button>
                </div>
            )}
            <AutomationBuilder job_id={jobDetails.jobId} stages={stages} applications={applications} />
            <div className="flex gap-4">
                {stages?.map((stage) => (
                    <Column
                        key={stage.stage_order_id}
                        stage={stage}
                        applications={applicationsByStage(stage.id)}
                        showTriggers={showTriggers}
                        setShowTriggers={setShowTriggers}
                        isEnabled={false}
                        jobId={applications[0]?.job_id}
                        jobDetails={jobDetails}
                        active={active}
                        setActive={setActive}
                        handleDrop={handleDrop}
                    />
                ))}
            </div>
        </div>
    )
};

function computeReorder(
    allCards: ApplicationType[],
    cardId: number,
    targetStageName: z.infer<typeof JOB_STAGES>,
    targetStageId: number,
    insertBeforeId: number | null, // null = append to end
    stages: StageResponseType[]
): {
    updatedCards: ApplicationType[];
    payload: ReorderPayload;
} {
    // Clone to avoid mutation
    const cards = allCards.map((c) => ({ ...c }));

    const movedCard = cards.find((c) => c.id === cardId);
    if (!movedCard) {
        return { updatedCards: allCards, payload: { applicationId: cardId, newStageId: targetStageId, targetOrders: [] } };
    };

    const originalStageName = movedCard.stage;
    const isMove = originalStageName !== targetStageName;

    // Update moved card's stage
    movedCard.stage = targetStageName;
    movedCard.current_stage_id = targetStageId;

    // Build sorted target column, excluding the moved card so we can re-insert cleanly
    const targetCards = cards
        .filter((c) => c.stage === targetStageName && c.id !== cardId)
        .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));

    const insertIndex =
        insertBeforeId === null
            ? targetCards.length
            : Math.max(0, targetCards.findIndex((c) => c.id === insertBeforeId));

    targetCards.splice(insertIndex === -1 ? targetCards.length : insertIndex, 0, movedCard);
    targetCards.forEach((c, idx) => (c.position_in_stage = idx));

    const targetOrders: CardOrder[] = targetCards.map((c, idx) => ({
        id: c.id!,
        position: idx,
    }));

    let sourceStageId: number | undefined;
    let sourceOrders: CardOrder[] | undefined;

    if (isMove) {
        const sourceCards = cards
            .filter((c) => c.stage === originalStageName && c.id !== cardId)
            .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));
        sourceCards.forEach((c, idx) => (c.position_in_stage = idx));

        const sourceStage = stages.find((s) => s.stage_name === originalStageName);
        sourceStageId = sourceStage?.id;
        sourceOrders = sourceCards.map((c, idx) => ({ id: c.id!, position: idx }));
    }

    // Merge updated target (and source) back into the full cards array
    const updatedById = new Map(cards.map((c) => [c.id, c]));
    targetCards.forEach((c) => updatedById.set(c.id, c));

    const payload: ReorderPayload = {
        applicationId: cardId,
        newStageId: targetStageId,
        targetOrders,
        ...(isMove && { sourceStageId, sourceOrders }),
    };

    return { updatedCards: Array.from(updatedById.values()), payload };
};

export default Kanban;
