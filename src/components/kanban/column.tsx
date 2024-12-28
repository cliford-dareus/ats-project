'use client'

import {DragEvent, useState} from "react";
import Card from "@/components/kanban/card";
import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import DropIndicator from "@/components/kanban/drop-indicator";

type Props = {
    title: string;
    headingColor: string;
    cards: JobListingWithCandidatesType[];
    column: "New Candidate" | "Screening" | "Phone Interview" | "Offer" | null;
    setCards: (cards: JobListingWithCandidatesType[]) => void;
}

const Column = ({title, headingColor, cards, column, setCards}: Props) => {
    const [active, setActive] = useState(false);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, i: number) => {
        e.dataTransfer.setData("cardId", String(i));
    };

    const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
        const cardId = Number(e.dataTransfer.getData("cardId"));

        setActive(false);
        clearHighlights();

        const indicators = getIndicators();
        const {element} = getNearestIndicator(e, indicators);

        const before = Number(element?.dataset.before) || -1;

        if (before !== cardId) {
            let copy = [...cards];

            console.log(copy);

            let cardToTransfer = copy.find((c) => c.candidate_id === cardId);

            if (!cardToTransfer) return;
            cardToTransfer = {...cardToTransfer, stageName: column};

            copy = copy.filter((c) => c.candidate_id !== cardId);

            const moveToBack = before === -1;

            if (moveToBack) {
                copy.push(cardToTransfer!);
            } else {
                const insertAtIndex = copy.findIndex((el) => el.candidate_id === before);
                if (insertAtIndex === undefined) return;
                copy.splice(insertAtIndex, 0, cardToTransfer!);
            }

            setCards(copy);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        highlightIndicator(e);
        setActive(true);
    };

    const clearHighlights = (els?: HTMLDivElement[]) => {
        const indicators = els || getIndicators();

        indicators.forEach((i) => {
            i.style.opacity = "0";
        });
    };

    const highlightIndicator = (e: DragEvent<HTMLDivElement>) => {
        const indicators = getIndicators();

        clearHighlights(indicators);

        const el = getNearestIndicator(e, indicators);
        (el.element as HTMLDivElement).style.opacity = "1";
    };

    const getNearestIndicator = (e: DragEvent<HTMLDivElement>, indicators: HTMLDivElement[]) => {
        const DISTANCE_OFFSET = 50;

        const el = indicators.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();

                const offset = e.clientY - (box.top + DISTANCE_OFFSET);

                if (offset < 0 && offset > closest.offset) {
                    return {offset: offset, element: child};
                } else {
                    return closest;
                }
            },
            {
                offset: Number.NEGATIVE_INFINITY,
                element: indicators[indicators.length - 1],
            }
        );

        return el;
    };

    const getIndicators = () => {
        return Array.from(document.querySelectorAll(`[data-column="${column}"]`) as unknown as HTMLDivElement[]);
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };

    const filteredCards = cards.filter((c) => c.stageName?.toLowerCase() === column);

    return (
        <div className="w-56 shrink-0">
            <div className="mb-3 flex items-center justify-between">
                <h3 className={`font-medium ${headingColor}`}>{title}</h3>
                <span className="rounded text-sm text-neutral-400">
          {filteredCards.length}
        </span>
            </div>
            <div
                // ref={}
                onDrop={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`h-full w-full transition-colors ${
                    active ? "bg-neutral-800/50" : "bg-neutral-800/0"
                }`}
            >
                {filteredCards.map((c: JobListingWithCandidatesType) => {
                    return <Card key={c.candidate_id} data={c} id={c.candidate_id} handleDragStart={(e: DragEvent<HTMLDivElement>) =>handleDragStart(e, c.candidate_id)} />;
                })}
                <DropIndicator beforeId={null} column={column} />
            </div>
        </div>
    );
};

export default Column;