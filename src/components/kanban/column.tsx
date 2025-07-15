"use client";

import React, {Dispatch, DragEvent, SetStateAction, useState} from "react";
import Card from "@/components/kanban/card";
import {ApplicationType, StageResponseType, TriggerResponseType} from "@/types";
import DropIndicator from "@/components/kanban/drop-indicator";
import {update_application_stage_action} from "@/server/actions/application_actions";
import {JOB_ENUM} from "@/zod";
import {Badge} from "@/components/ui/badge";
import {EllipsisVertical, WandSparkles} from "lucide-react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {cn} from "@/lib/utils";
import {TriggerAction, TriggerTask} from "@/plugins/smart-trigger/types";
import {usePluginContextHook} from "@/providers/plugins-provider";
import {isPluginActive} from "@/lib/plugins-registry";
import {DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger} from "../ui/dropdown-menu";
import SmartMoveTriggerModal from "@/components/modal/triggers/smart-move-trigger-modal";
import { add_trigger_to_stage_action } from "@/server/actions/stage_actions";
import { useModalDialog } from "@/hooks/use-modal-dialog";
import SmartEmailTriggerModal from "@/components/modal/triggers/smart-email-trigger-modal";

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

const FormSchema = z.object({
    stageName: z.string().min(5, {
        message: "Stage name must be at least 5 characters.",
    }),
});

const Column = ({title, cards, column, setCards, stage, color, showTriggers, setShowTriggers}: Props) => {
    // const context = usePluginContext;\
    const [openSmartMove, setOpenSmartMove] = useState({type: "", stage: "", action_type: ""});
    const { isModalOpen, openModal, closeModal} = useModalDialog();
    const context = usePluginContextHook();
    const tasks = [];
    const smart_trigger = isPluginActive("smart-triggers");
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
        // const drop_schedule = element?.dataset.scheduling === "true";

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

            if (title !== "Applied" && cardToTransfer.application_id) {
                console.log("CARD", cardToTransfer.application_id)
                await update_application_stage_action({
                    applicationId: cardToTransfer.application_id,
                    new_stage_id: dropStage,
                });
                setCards(copy);

                // add smarter logic
                if (!smart_trigger) return;
                context.onTriggerActivated(cardToTransfer.application_id, dropStage, stage.stage_name!)
                console.log(dropStage);
            }
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
    const filteredStages = context.jobStages.filter((t) => t.stage_name === stage.stage_name);

    const onSubmitTrigger = async (data: TriggerAction) => {
        try {
            await add_trigger_to_stage_action(stage.id, data);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="min-w-56 w-56">
            {showTriggers && <div className="h-10">
                {filteredStages.map((stage) => (
                    <div key={stage.id}>
                        {JSON.parse(stage.trigger).map((trigger: TriggerResponseType) => (
                            <div key={trigger.id}>{trigger.action_type}</div>
                        ))}
                    </div>
                ))}
            </div>}
            <div className="mb-2 flex items-center justify-between my-4">
                <div className="flex items-center gap-2">
                    <div className={cn(color, "h-3 w-3 rounded")}></div>
                    <p className={`font-medium text-slate-500 text-sm`}>{title}</p>
                    <Badge
                        className="rounded text-xs px-1  py-.5 flex items-center justify-center bg-muted text-slate-500"
                    >{filteredCards?.length}
                    </Badge>
                    <WandSparkles onClick={() => setShowTriggers(!showTriggers)} size={18} className="text-slate-400"/>
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
                        <EllipsisVertical size={18} className="-mr-1.5 text-slate-400"/>
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
                                            setOpenSmartMove({type: "email", stage: stage.stage_name!, action_type: "email"});
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
                                                                    setOpenSmartMove({type: item, stage: stage.stage_name!, action_type: "move"});
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
                className="h-full w-full transition-colors relative z-50 overflow-y-scroll"
            >
                {filteredCards?.map((c: ApplicationType) => {
                    return <Card
                        key={c.application_id}
                        stage={stage}
                        data={c}
                        tasks={tasks.filter((t: TriggerTask) => t.stages === stage.stage_name && t.application_id === c.application_id )}
                        handleDragStart={(e) => handleDragStart(e, c.application_id!)}
                    />;
                })}
                <DropIndicator beforeId={null} stage={stage} column={column} active={active}/>
            </div>
        </div>
    );
};

export default Column;
