"use client";

import React, { DragEvent, Dispatch, useEffect, useState, SetStateAction, useCallback, useRef } from "react";
import Card from "@/components/kanban/card";
import { ApplicationType, StageResponseType } from "@/types";
import DropIndicator from "@/components/kanban/drop-indicator";
import { moveApplicationAndReorder } from "@/server/actions/application_actions";
import { JOB_ENUM, JOB_STAGES } from "@/zod";
import { cn } from "@/lib/utils";
import { useModalDialog } from "@/hooks/use-modal-dialog";
import { useKanbanContext } from "@/providers/kanban-provider";
import { useSocket } from "@/providers/socket-provider";
import SmartTriggerModal from "@/components/modal/triggers/smart-trigger-modal";
import ColumnHeader from "./column-header";
import { add_trigger_to_stage_action } from "@/server/actions/stage_actions";
import SmartTriggerCard from "../smart-trigger/smart-trigger-card";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { z } from "zod";
type CardOrder = { id: number; position: number };

interface ReorderPayload {
    applicationId: number;
    newStageId: number;
    targetOrders: CardOrder[];
    sourceStageId?: number;
    sourceOrders?: CardOrder[];
};

type SmartMoveState = { type: string; stage: string; action_type: string };

type Props = {
    title: string;
    stage: StageResponseType;
    cards: ApplicationType[];
    color: string | null;
    column: JOB_ENUM;
    setCards: Dispatch<SetStateAction<ApplicationType[] | undefined>>;
    showTriggers: boolean;
    setShowTriggers: Dispatch<SetStateAction<boolean>>;
    jobId: number;
    triggerAction: (data: {
        applicationId: number;
        stageId: number;
        stageName: string;
    }) => Promise<void>;
    isEnabled: boolean;
    stages: StageResponseType[];
    jobDetails: { jobName: string; department: string };
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

export default function Column({
    title,
    stage,
    cards,
    color,
    column,
    setCards,
    showTriggers,
    setShowTriggers,
    jobId,
    jobDetails,
    triggerAction,
    stages,
    isEnabled,
}: Props) {
    const { socket } = useSocket();
    const { fetchApplicationTasks } = useKanbanContext();

    const [active, setActive] = useState(false);
    const [openSmartMove, setOpenSmartMove] = useState<SmartMoveState>({
        type: "",
        stage: "",
        action_type: "",
    });
    const { isModalOpen, openModal, closeModal } = useModalDialog();

    // Refs to avoid re-creating socket listener when these change
    const volatileRef = useRef({ setCards, stages, stage, fetchApplicationTasks });
    useEffect(() => {
        volatileRef.current = { setCards, stages, stage, fetchApplicationTasks };
    });

    // Container ref so indicator queries are scoped, not global DOM queries
    const containerRef = useRef<HTMLDivElement>(null);

    const fireTriggerAction = useCallback(
        async (cardId: number, stageId: number, targetStage: StageResponseType) => {
            if (!isEnabled) return;
            await triggerAction({
                applicationId: cardId,
                stageId,
                stageName: targetStage.stage_name!,
            });
        },
        [isEnabled, triggerAction]
    );

    // ──────────────────────────────────────────────
    // Drop indicator helpers (scoped to this column)
    // ──────────────────────────────────────────────
    const getIndicators = useCallback((): HTMLDivElement[] => {
        if (!containerRef.current) return [];
        return Array.from(
            containerRef.current.querySelectorAll<HTMLDivElement>(`[data-column="${column}"]`)
        );
    }, [column]);

    const clearHighlights = useCallback(
        (elements?: HTMLDivElement[]) => {
            (elements ?? getIndicators()).forEach((el) => (el.style.opacity = "0"));
        },
        [getIndicators]
    );

    const getNearestIndicator = useCallback(
        (e: DragEvent<HTMLDivElement>, indicators: HTMLDivElement[]) => {
            const OFFSET = 50;
            return indicators.reduce(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = e.clientY - (box.top + OFFSET);
                    if (offset < 0 && offset > closest.offset) {
                        return { offset, element: child };
                    }
                    return closest;
                },
                {
                    offset: Number.NEGATIVE_INFINITY,
                    element: indicators[indicators.length - 1]!,
                }
            );
        },
        []
    );

    const highlightIndicator = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            const indicators = getIndicators();
            clearHighlights(indicators);
            const { element } = getNearestIndicator(e, indicators);
            if (element) element.style.opacity = "1";
        },
        [getIndicators, clearHighlights, getNearestIndicator]
    );

    // ────────────────────────────────────────────────
    // Drag & Drop Logic
    // ────────────────────────────────────────────────
    const handleDragStart = (e: DragEvent<HTMLDivElement>, applicationId: number) => {
        e.dataTransfer.setData("cardId", String(applicationId));
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        highlightIndicator(e);
        setActive(true);
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setActive(false);
        clearHighlights();

        const cardId = Number(e.dataTransfer.getData("cardId"));
        if (!cardId) return;

        const indicators = getIndicators();
        const { element } = getNearestIndicator(e, indicators);

        const beforeId = Number(element?.dataset.before ?? -1);
        const dropStageId = Number(element?.dataset.stage ?? stage.id);

        // Same position → no-op
        if (beforeId === cardId) return;

        // Snapshot for rollback on server failure
        const snapshot = cards.map((c) => ({ ...c }));
        
        const { updatedCards, payload } = computeReorder(
            cards,
            cardId,
            column,           // this column is the drop target
            dropStageId,
            beforeId,
            stages
        );

        const isMove = snapshot.find((c) => c.id === cardId)?.stage !== column;

        // Optimistic update
        setCards(updatedCards);

        if (isMove) {
            const result = await moveApplicationAndReorder(payload);

            if (!result.success) {
                // Roll back optimistic update
                setCards(snapshot);
                // TODO: surface a toast/error to the user here
                return;
            }

            await fireTriggerAction(cardId, dropStageId, stage);
            await fetchApplicationTasks();
        } else {
            // Same-column reorder: still persist the new order
            const result = await moveApplicationAndReorder(payload);
            if (!result.success) {
                setCards(snapshot);
            }
        }
    };

    // ────────────────────────────────────────────────
    // Socket – handle external job completion
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !jobId) return;

        socket.emit("join-board", jobId);

        const onJobCompleted = async (data: any) => {
            const appId: number | undefined = data?.payload?.applicationId;
            const newStageName: string | undefined = data?.payload?.newStageName;
            if (!appId || !newStageName) return;

            const { setCards, stages, fetchApplicationTasks } = volatileRef.current;

            const targetStage = stages.find((s) => s.stage_name === newStageName);
            if (!targetStage) return;

            // Snapshot outside setState for rollback
            let snapshot: ApplicationType[] | undefined;
            let payload: ReorderPayload | null = null;

            setCards((prev) => {
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
                    if (snapshot) setCards(snapshot);
                }
                await fetchApplicationTasks();
            }
        };

        socket.on("job-completed", onJobCompleted);

        return () => {
            socket.off("job-completed", onJobCompleted);
        };
    }, [socket, jobId]);

    useEffect(() => {
        console.log('Column rendered →', {
            stage: stage.stage_name,
            cardsCount: cards.length,
            triggersCount: stages.length
        });
    }, [stage, cards, stages]);

    // ──────────────────────────────────────────────
    // Modal helpers – reset both pieces of state together
    // ──────────────────────────────────────────────
    const handleCloseModal = () => {
        closeModal();
        setOpenSmartMove({ type: "", stage: "", action_type: "" });
    };

    // ──────────────────────────────────────────────
    // Trigger submission
    // ──────────────────────────────────────────────
    const onSubmitTrigger = async (data: any) => {
        try {
            await add_trigger_to_stage_action(stage.id, data);
        } catch (err) {
            console.error("Failed to add trigger:", err);
        }
    };

    // ──────────────────────────────────────────────
    // Derived state
    // ──────────────────────────────────────────────
    const filteredCards = cards
        .filter((c) => c.stage === column)
        .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));

    const stageTriggers = JSON.parse(stage.trigger ?? "[]") as TriggerAction[];

    // ────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────
    return (
        <div className="min-w-[230px] w-[230px]">
            {/* Smart Triggers Row */}
            <span className="sr-only">Smart Triggers</span>
            {isEnabled && showTriggers && (
                <div className="mb-3 space-y-2">
                    {stageTriggers.map((trigger) => (
                        <SmartTriggerCard key={trigger.id} trigger={trigger} />
                    ))}
                </div>
            )}

            {/* Header */}
            <ColumnHeader
                color={color}
                title={title}
                stage={stage.stage_name}
                openModal={openModal}
                filteredCards={filteredCards}
                hasSmartTrigger={isEnabled}
                setShowTriggers={setShowTriggers}
                setOpenSmartMove={setOpenSmartMove}
            />

            {/* Cards + Drop Zone */}
            <div
                ref={containerRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "min-h-[200px] h-full rounded-md transition-colors p-1",
                    active && "bg-blue-50/70 border-2 border-blue-300"
                )}
            >
                {filteredCards.map((card) => (
                    <Card
                        key={card.id}
                        stage={stage}
                        data={card}
                        jobDetails={jobDetails}
                        handleDragStart={(e) => handleDragStart(e, card.id!)}
                    />
                ))}

                <DropIndicator beforeId={null} stage={stage} column={column} active={active} />
            </div>

            {/* Modals */}
            <SmartTriggerModal
                isModalOpen={isModalOpen && !!openSmartMove.type}
                closeModal={handleCloseModal}
                triggerType={openSmartMove.type}
                onSubmit={onSubmitTrigger}
            />
        </div>
    );
}
