"use client";

import React, { Dispatch, SetStateAction, useRef, useCallback, DragEvent } from "react";
import Card from "@/components/kanban/card";
import { ApplicationType, StageResponseType } from "@/types";
import DropIndicator from "@/components/kanban/drop-indicator";
import { cn } from "@/lib/utils";

type Props = {
    stage: StageResponseType;
    applications: ApplicationType[];
    showTriggers: boolean;
    setShowTriggers: Dispatch<SetStateAction<boolean>>;

    isEnabled: boolean;

    jobId: number;
    jobDetails: { jobName: string; department: string };
    active: boolean;
    setActive: Dispatch<SetStateAction<boolean>>;
    handleDrop: (e: React.DragEvent<HTMLDivElement>, element: any, stageId: number, column: any) => void;
};

export default function Column({
    stage,
    applications,
    jobDetails,
    active,
    setActive,
    handleDrop,
}: Props) {
    // Container ref so indicator queries are scoped, not global DOM queries
    const containerRef = useRef<HTMLDivElement>(null);

    // ──────────────────────────────────────────────
    // Drop indicator helpers (scoped to this column)
    // ──────────────────────────────────────────────
    const getIndicators = useCallback((): HTMLDivElement[] => {
        if (!containerRef.current) return [];
        return Array.from(
            containerRef.current.querySelectorAll<HTMLDivElement>(`[data-column="${stage.stage_name}"]`)
        );
    }, [stage.stage_name]);

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

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        clearHighlights();
        setActive(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        highlightIndicator(e);
        setActive(true);
    };

    const handleDropInternal = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        clearHighlights();
        const indicators = getIndicators();
        const { element } = getNearestIndicator(e, indicators);

        if (element) handleDrop(e, element, stage.id, stage.stage_name);
    };
    
    // ────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────
    return (
        <div className="min-w-[230px] w-[230px]">            
            {/* Cards + Drop Zone */}
            <div
                ref={containerRef}
                onDrop={handleDropInternal}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "min-h-[200px] border border-zinc-200 h-full rounded-[14px] transition-colors p-1",
                    active && "bg-blue-50/70 border-2 border-blue-300"
                )}
            >
                {applications.map((card) => (
                    <Card
                        key={card.id}
                        stage={stage}
                        data={card}
                        jobDetails={jobDetails}
                        handleDragStart={(e) => handleDragStart(e, card.id!)}
                    />
                ))}

                <DropIndicator beforeId={null} stage={stage} column={stage.stage_name} active={active} />
            </div>
        </div>
    );
}
