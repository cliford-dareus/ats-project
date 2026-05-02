"use client";

import React, { Dispatch, DragEvent, SetStateAction, useEffect, useState } from "react";
import Card from "@/components/kanban/card";
import { ApplicationType, StageResponseType } from "@/types";
import DropIndicator from "@/components/kanban/drop-indicator";
import { update_application_stage_action } from "@/server/actions/application_actions";
import { JOB_ENUM } from "@/zod";
import { Badge } from "@/components/ui/badge";
import { EllipsisVertical, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TriggerAction } from "@/plugins/smart-trigger/types";
import { usePluginContextHook } from "@/providers/plugins-provider";
import { pluginRegistry } from "@/lib/plugins-registry";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from "../ui/dropdown-menu";
import SmartMoveTriggerModal from "@/components/modal/triggers/smart-move-trigger-modal";
import { add_trigger_to_stage_action } from "@/server/actions/stage_actions";
import { useModalDialog } from "@/hooks/use-modal-dialog";
import SmartEmailTriggerModal from "@/components/modal/triggers/smart-email-trigger-modal";
import { useRouter } from "next/navigation";
import TriggerCard from "../trigger-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
    title: string;
    stage: StageResponseType;
    cards: ApplicationType[];
    color: string | null;
    column: JOB_ENUM;
    setCards: Dispatch<SetStateAction<ApplicationType[] | undefined>>;
    showTriggers: boolean;
    setShowTriggers: Dispatch<SetStateAction<boolean>>;
};

const Column = ({ title, cards, column, setCards, stage, color, showTriggers, setShowTriggers }: Props) => {
    const [hasRefreshedYet, setHasRefreshedYet] = useState(false);
    const [openSmartMove, setOpenSmartMove] = useState({ type: "", stage: "", action_type: "" });
    const { isModalOpen, openModal, closeModal } = useModalDialog();
    const context = usePluginContextHook();
    const smartTriggers = pluginRegistry.get("smart-triggers");
    const [active, setActive] = useState(false);
    const router = useRouter();

    const handleDragStart = (e: DragEvent<HTMLDivElement>, i: number) => {
        (e as DragEvent).dataTransfer.setData("cardId", String(i));
    };

    const handleDragEnd = async (e: DragEvent<HTMLDivElement>) => {
        const cardId = Number(e.dataTransfer.getData("cardId"));

        setActive(false);
        clearHighlights();

        const indicators = getIndicators();
        const { element } = getNearestIndicator(e, indicators);

        const before = Number(element?.dataset.before) || -1;
        const dropStage = Number(element?.dataset.stage);
        // const drop_schedule = element?.dataset.scheduling === "true";

        if (before !== cardId) {
            let copy = [...cards];
            let cardToTransfer = copy.find((c) => c.application_id === cardId);

            if (!cardToTransfer) return;
            cardToTransfer = { ...cardToTransfer, stageName: column };
            copy = copy.filter((c) => c.application_id !== cardId);
            const moveToBack = before === -1;

            if (moveToBack) {
                copy.push(cardToTransfer!);
            } else {
                const insertAtIndex = copy.findIndex((el) => el.application_id === before);
                if (insertAtIndex === undefined) return;
                copy.splice(insertAtIndex, 0, cardToTransfer!);
            };

            if (title !== "Applied" && cardToTransfer.application_id) {
                console.log("CARD", cardToTransfer.application_id)
                await update_application_stage_action({
                    applicationId: cardToTransfer.application_id,
                    new_stage_id: dropStage,
                });
                setCards(copy);

                if (smartTriggers?.config && typeof smartTriggers.config.actions?.triggerAction === "function" && smartTriggers.enabled) {
                    smartTriggers.config.actions?.triggerAction(context, {
                        applicationId: cardToTransfer.application_id,
                        stageId: dropStage,
                        stageName: stage.stage_name!
                    });
                }
                context.fetchApplicationTasks();
            };
        };
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
                    return { offset: offset, element: child };
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
    const filteredStages = context.jobStages.filter((t) => t.stage_name === stage.stage_name);

    const onSubmitTrigger = async (data: TriggerAction) => {
        try {
            await add_trigger_to_stage_action(stage.id, data);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const checkExpireAndRefresh = () => {
            const now = Date.now();
            const anyExpired = context.tasks.some(task => new Date(task.triggerTime).getTime() < now);
            if (anyExpired && !hasRefreshedYet) {
                setHasRefreshedYet(true);
                context.fetchApplicationTasks();
                router.refresh();
            }
        };

        const interval = setInterval(checkExpireAndRefresh, 5000);
        return () => clearInterval(interval);
    }, [context.tasks]);

    return (
        <div className="min-w-56 w-56">
            {smartTriggers?.enabled && showTriggers && <div className="">
                {filteredStages.map((stage) => <TriggerCard key={stage.id} stage={stage} />)}
            </div>}
            <div className="mb-2 flex items-center justify-between my-4">
                <div className="flex items-center gap-2">
                    <div className={cn(color, "h-3 w-3 rounded")}></div>
                    <p className={`font-medium text-slate-500 text-sm`}>{title}</p>
                    <Badge
                        className="rounded text-xs px-1  py-.5 flex items-center justify-center bg-muted text-slate-500"
                    >{filteredCards?.length}
                    </Badge>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <WandSparkles onClick={() => setShowTriggers(!showTriggers)} size={18} className="text-slate-400 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                            {smartTriggers?.enabled ? <p>Smart Triggers</p> : <p>The Smart Triggers plugin is not enabled.</p>}
                        </TooltipContent>
                    </Tooltip>
                </div>

                <SmartMoveTriggerModal
                    isModalOpen={isModalOpen && openSmartMove.action_type === "move" && !!openSmartMove.type}
                    closeModal={closeModal}
                    triggerType={openSmartMove.type}
                    onSubmit={onSubmitTrigger}
                />
                <SmartEmailTriggerModal
                    isModalOpen={isModalOpen && openSmartMove.action_type === "email"}
                    closeModal={closeModal}
                    onSubmit={onSubmitTrigger}
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <EllipsisVertical size={18} className="-mr-1.5 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Sort
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Trigger</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => {
                                            openModal()
                                            setOpenSmartMove({
                                                type: "email",
                                                stage: stage.stage_name!,
                                                action_type: "email"
                                            });
                                        }}>Smart Email</DropdownMenuItem>
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Smart Move</DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                                <DropdownMenuSubContent>
                                                    {
                                                        ["location", "experience", "score"].map((item) => (
                                                            <DropdownMenuItem
                                                                key={item}
                                                                onClick={() => {
                                                                    openModal()
                                                                    setOpenSmartMove({
                                                                        type: item,
                                                                        stage: stage.stage_name!,
                                                                        action_type: "move"
                                                                    });
                                                                }}
                                                            >
                                                                {item}
                                                            </DropdownMenuItem>
                                                        ))
                                                    }
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>More...</DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuItem>Smart Schedule</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem>
                                Add to Calendar
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div
                onDrop={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn("h-full w-full transition-colors no-scrollbar", { "bg-blue-100": active })}
            >
                {filteredCards?.map((c: ApplicationType) => {
                    return <Card
                        key={c.id}
                        stage={stage}
                        data={c}
                        handleDragStart={(e) => handleDragStart(e, c.application_id!)}
                    />;
                })}
                <DropIndicator beforeId={null} stage={stage} column={column} active={active} />
            </div>
        </div>
    );
};

export default Column;
