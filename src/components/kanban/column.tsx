'use client'

import React, {Dispatch, DragEvent, SetStateAction, useState} from "react";
import Card from "@/components/kanban/card";
import {JobListingWithCandidatesType} from "@/types/job-listings-types";
import DropIndicator from "@/components/kanban/drop-indicator";
import {update_application_stage_action} from "@/server/actions/application_actions";
import {JOB_ENUM} from "@/schema";
import {Badge} from "@/components/ui/badge";
import {EllipsisVertical} from "lucide-react";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {useForm} from "react-hook-form";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Button} from "@/components/ui/button";

type Props = {
    title: string;
    stage: number;
    cards: JobListingWithCandidatesType[];
    column: JOB_ENUM
    setCards: Dispatch<SetStateAction<JobListingWithCandidatesType[] | undefined>>
};

const FormSchema = z.object({
    stageName: z.string().min(5, {
        message: "Stage name must be at least 5 characters.",
    }),
});

const Column = ({title, cards, column, setCards, stage}: Props) => {
    const [active, setActive] = useState(false);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            stageName: "",
        },
    });

    const handleDragStart = (e: DragEvent<HTMLDivElement>, i: number) => {
        (e as DragEvent).dataTransfer.setData("cardId", String(i));
    };

    const handleDragEnd = async (e: DragEvent<HTMLDivElement>) => {
        const cardId = Number(e.dataTransfer.getData("cardId"));

        setActive(false);
        clearHighlights();

        const indicators = getIndicators();
        const {element} = getNearestIndicator(e, indicators);

        const before = Number(element?.dataset.before) || -1;
        const dropStage = Number(element?.dataset.stage);

        if (before !== cardId) {
            let copy = [...cards];
            let cardToTransfer = copy.find((c) => c.application_id === cardId);

            if (!cardToTransfer) return;
            cardToTransfer = {...cardToTransfer, stageName: column};

            copy = copy.filter((c) => c.application_id !== cardId);

            const moveToBack = before === -1;

            if (moveToBack) {
                copy.push(cardToTransfer!);
            } else {
                const insertAtIndex = copy.findIndex((el) => el.application_id === before);
                if (insertAtIndex === undefined) return;
                copy.splice(insertAtIndex, 0, cardToTransfer!);
            }

            await update_application_stage_action({
                candidateId: cardToTransfer.application_id!,
                current_stage_id: dropStage
            });

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

        return indicators.reduce(
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
    };

    const getIndicators = () => {
        return Array.from(document.querySelectorAll(`[data-column="${column}"]`) as unknown as HTMLDivElement[]);
    };

    const handleDragLeave = () => {
        clearHighlights();
        setActive(false);
    };

    const filteredCards = cards?.filter((c) => c.stageName === column);

    return (
        <div className="min-w-52 w-52">
            <div className="mb-2 flex items-center justify-between my-4">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-red-300"></div>
                    <p className={`font-medium text-slate-500 text-sm`}>{title}</p>
                    <Badge
                        className="rounded text-xs px-1  py-.5 flex items-center justify-center bg-muted text-slate-500"
                    >{filteredCards?.length}
                    </Badge>
                </div>

                <Dialog>
                    <DialogTrigger>
                        <EllipsisVertical size={18} className="-mr-1.5 text-slate-400"/>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Update Stage</DialogTitle>
                        <div>
                            <Form {...form}>
                                <form>
                                    <FormField
                                        control={form.control}
                                        name="stageName"
                                        render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Stage Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="shadcn" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    This is your public display name.{stage}
                                                </FormDescription>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />

                                    <Button>Update Stage</Button>
                                </form>
                            </Form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div
                onDrop={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="h-full w-full transition-colors relative z-50 overflow-y-scroll"
            >
                {filteredCards?.map((c: JobListingWithCandidatesType) => {
                    return <Card
                        key={c.application_id}
                        stage={stage}
                        data={c}
                        handleDragStart={(e) => handleDragStart(e, c.application_id!)}
                    />;
                })}
                <DropIndicator beforeId={null} stage={stage} column={column} active={active}/>
            </div>
        </div>
    );
};

export default Column;