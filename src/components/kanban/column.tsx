"use client";

import React, {DragEvent, Dispatch, useEffect, useState, SetStateAction} from "react";
import Card from "@/components/kanban/card";
import { ApplicationType, StageResponseType } from "@/types";
import DropIndicator from "@/components/kanban/drop-indicator";
import {moveApplicationAndReorder} from "@/server/actions/application_actions";
import { JOB_ENUM } from "@/zod";
import { cn } from "@/lib/utils";
import { useModalDialog } from "@/hooks/use-modal-dialog";
import TriggerCard from "../trigger-card";
import { useKanbanContext } from "@/providers/kanban-provider";
import { usePlugin } from "@/providers/plugin-provider";
import { lifecycle } from "@/lib/smart-trigger/lifecycle";
import { useSocket } from "@/providers/socket-provider";
import SmartTriggerModal from "@/components/modal/triggers/smart-trigger-modal";
import ColumnHeader from "./column-header";
import { add_trigger_to_stage_action } from "@/server/actions/stage_actions";

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
    jobDetails: {jobName: string, department: string}
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
                                    jobDetails
                               }: Props) {
    const { socket } = useSocket();
    const [active, setActive] = useState(false);
    const [openSmartMove, setOpenSmartMove] = useState({
        type: "",
        stage: "",
        action_type: "",
    });
    const { isModalOpen, openModal, closeModal } = useModalDialog();
    const { triggers, jobStages, fetchApplicationTasks } = useKanbanContext();
    const hasSmartTrigger = usePlugin("smart-triggers");
    const smartTriggers = lifecycle;

    // ────────────────────────────────────────────────
    // Drag & Drop Logic
    // ────────────────────────────────────────────────

    const handleDragStart = (e: DragEvent<HTMLDivElement>, applicationId: number) => {
        e.dataTransfer.setData("cardId", String(applicationId));
    };

    const handleDragEnd = async (e: DragEvent<HTMLDivElement>) => {
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

        // Find original card and its stage
        const originalCard = cards.find((c) => c.id === cardId);
        if (!originalCard) return;

        const originalStageName = originalCard.stage;
        const isMove = originalStageName !== column;

        // Clone all cards to avoid mutation
        const newCards = cards.map((c) => ({ ...c }));

        // Update the moved card's stage (if moving)
        const movedCard = newCards.find((c) => c.id === cardId)!;
        movedCard.stage = column;

        // Handle target stage ordering
        let targetCards = newCards
            .filter((c) => c.stage === column)
            .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));

        // If not a move, remove the moved card from targetCards before inserting
        if (!isMove) {
            targetCards = targetCards.filter((c) => c.id !== cardId);
        }

        // Reset order for moved card if moving to new stage
        if (isMove) movedCard.position_in_stage = -1;

        // Find insert position in sorted targetCards
        let insertIndex =
            beforeId === -1 ? targetCards.length : targetCards.findIndex((c) => c.id === beforeId);
        if (insertIndex === -1) insertIndex = targetCards.length;

        // Insert moved card
        targetCards.splice(insertIndex, 0, movedCard);

        // Reassign sequential orders to target
        targetCards.forEach((c, idx) => (c.position_in_stage = idx));

        const targetUpdates = targetCards.map((card, idx) => ({
            id: card.id,           // internal PK, not application_id if different
            position: idx,
        }));

        let payload: any = {
            applicationId: movedCard.id,
            newStageId: dropStageId,
            targetOrders:targetUpdates,
        };

        // If move, reassign orders to source stage
        if (isMove) {
            const sourceStage = jobStages.find((s) => s.stage_name === originalStageName);
            if (sourceStage) {
                const sourceCards = newCards
                    .filter((c) => c.stage === originalStageName)
                    .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));
                sourceCards.forEach((c, idx) => (c.position_in_stage = idx));

                const sourceUpdates = sourceCards.map((card, idx) => ({
                    id: card.id,
                    position: idx,
                }));
                payload = {
                    ...payload,
                    sourceStageId: sourceStage.id,
                    sourceOrders:sourceUpdates,
                };
            }
        }

        // Rebuild full newCards with updated objects (no need to replace since mutated clones)
        setCards(newCards);

        // If moving stages, update stage on backend
        if (isMove) {
            const result = await moveApplicationAndReorder(payload);
            if (!result.success) {
                // rollback optimistic update or show error
                // setCards()
            }

            // Trigger smart actions if enabled
            if (smartTriggers?.triggerAction && hasSmartTrigger) {
                await smartTriggers.triggerAction(triggers, {
                    applicationId: cardId,
                    stageId: dropStageId,
                    stageName: stage.stage_name!,
                    jobId,
                });
            }

            await fetchApplicationTasks();
        }


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

    const getIndicators = (): HTMLDivElement[] =>
        Array.from(document.querySelectorAll(`[data-column="${column}"]`)) as HTMLDivElement[];

    const clearHighlights = (elements = getIndicators()) => {
        elements.forEach((el) => (el.style.opacity = "0"));
    };

    const getNearestIndicator = (e: DragEvent<HTMLDivElement>, indicators: HTMLDivElement[]) => {
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
    };

    const highlightIndicator = (e: DragEvent<HTMLDivElement>) => {
        const indicators = getIndicators();
        clearHighlights(indicators);

        const { element } = getNearestIndicator(e, indicators);
        if (element) element.style.opacity = "1";
    };

    // ────────────────────────────────────────────────
    // Socket – handle external job completion
    // ────────────────────────────────────────────────

    useEffect(() => {
        if (!socket || !jobId) return;

        socket.emit("join-board", jobId);

        const onJobCompleted = async (data: any) => {
            const appId = data?.payload?.applicationId;
            const newStageId = data?.payload?.newStageId;
            if (!appId || !newStageId) return;

            // 1. Find the target stage object to get the name
            const targetStage = jobStages.find(s => s.id === newStageId);
            if (!targetStage) return;

            let actionPayload: any = null;

            // 2. Perform Optimistic Update (Synchronous)
            setCards((prev) => {
                const newCards = [...(prev as ApplicationType[])];
                const cardIndex = newCards.findIndex(c => c.id === appId);
                if (cardIndex === -1) return prev;

                const movedCard = { ...newCards[cardIndex] };
                const originalStageName = movedCard.stage;
                const isMove = originalStageName !== targetStage.stage_name;

                // Update properties
                movedCard.stage = targetStage.stage_name;
                movedCard.current_stage_id = newStageId;

                // Recalculate Target Column Orders
                const otherCardsInTarget = newCards
                    .filter(c => c.stage === targetStage.stage_name && c.id !== appId)
                    .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));

                // Append to end of target column
                const finalTargetCards = [...otherCardsInTarget, movedCard];
                finalTargetCards.forEach((c, idx) => (c.position_in_stage = idx));

                // Recalculate Source Column Orders (if it was a move)
                let finalSourceCards: ApplicationType[] = [];
                if (isMove) {
                    finalSourceCards = newCards
                        .filter(c => c.stage === originalStageName && c.id !== appId)
                        .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));
                    finalSourceCards.forEach((c, idx) => (c.position_in_stage = idx));
                }

                // Prepare the payload for the Server Action (outside this function)
                actionPayload = {
                    applicationId: appId,
                    newStageId: newStageId,
                    jobId: jobId, // from your page context
                    targetOrders: finalTargetCards.map(c => ({
                        id: c.id,
                        position: c.position_in_stage
                    })),
                    sourceStageId: isMove ? jobStages.find(s => s.stage_name === originalStageName)?.id : undefined,
                    sourceOrders: isMove ? finalSourceCards.map(c => ({
                        id: c.id,
                        position: c.position_in_stage
                    })) : undefined,
                };

                // Combine all cards back together
                const otherColumns = newCards.filter(c =>
                    c.stage !== targetStage.stage_name &&
                    c.stage !== originalStageName
                );

                return [...otherColumns, ...finalTargetCards, ...finalSourceCards];
            });

            // 3. Call Server Action (Outside the setter)
            if (actionPayload) {
                const result = await moveApplicationAndReorder(actionPayload);
                if (!result.success) {
                    console.error("Failed to sync move to database");
                    // Optional: Fetch fresh data from server to rollback UI
                }
            }
        };

        socket.on("job-completed", onJobCompleted);

        return () => {
            socket.off("job-completed", onJobCompleted);
        };
    }, [socket, jobId, column, setCards, jobStages, stage]);

    // ────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────

    const filteredCards = cards
        .filter((c) => c.stage === column)
        .sort((a, b) => (a.position_in_stage ?? 0) - (b.position_in_stage ?? 0));

    const stageTriggers = jobStages.filter((s) => s.stage_name === stage.stage_name);

    const onSubmitTrigger = async (data: any) => {
        try {
            await add_trigger_to_stage_action(stage.id, data);
        } catch (err) {
            console.error("Failed to add trigger:", err);
        }
    };

    return (
        <div className="min-w-[230px] w-[230px]">
            {/* Smart Triggers Row */}
            <span className="sr-only">Smart Triggers</span>
            {hasSmartTrigger && showTriggers && (
                <div className="mb-3 space-y-2">
                    {stageTriggers.map((st) => (
                        <TriggerCard key={st.id} stage={st} />
                    ))}
                </div>
            )}

            {/* Header */}
            <ColumnHeader
                stage={stage.stage_name}
                color={color}
                title={title}
                filteredCards={filteredCards}
                openModal={openModal}
                hasSmartTrigger={hasSmartTrigger}
                setShowTriggers={setShowTriggers}
                setOpenSmartMove={setOpenSmartMove}
            />


            {/* Cards + Drop Zone */}
            <div
                onDrop={handleDragEnd}
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
                closeModal={closeModal}
                triggerType={openSmartMove.type}
                onSubmit={onSubmitTrigger}
            />
        </div>
    );
}
