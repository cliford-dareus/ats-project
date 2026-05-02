"use client";

import React from "react";
import {StageResponseType, TriggerResponseType} from "@/types";
import {GitCompareArrows, Network, Send} from "lucide-react"
import {ConfigType} from "@/plugins/smart-trigger/types";

type Props = {
    stage: StageResponseType;
};

const TriggerCard = ({stage}: Props) => {
    const triggers = JSON.parse(stage.trigger) as TriggerResponseType[];
    return (
        <>
            {triggers.map((trigger: TriggerResponseType) => {
                const config = trigger?.config as unknown as ConfigType;

                if (trigger.action_type === null) {
                    return (
                        <div key={trigger.id} className="h-[75px] border rounded-md p-4 text-slate-500 text-sm">
                            <p>No trigger</p>
                        </div>)
                };

                return (
                    <div key={trigger.id} className="border p-4 rounded-md mb-4">
                        <div className="text-slate-500">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <p>if</p>
                                <p>{config?.condition?.type}</p>
                                <Network size={18} className="text-blue-500"/>
                                <p>is</p>
                                <p>{config?.condition?.location}</p>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <div className="text-blue-500">{trigger.action_type === 'move' ?
                                    <GitCompareArrows size={18}/> :
                                    trigger.action_type === 'email' ?
                                        <Send size={18}/> :
                                        null
                                }
                                </div>
                                <p className="text-slate-500">{trigger.action_type}</p>
                                <p>to</p>
                                <p>{config?.condition?.target}</p>
                            </div>

                        </div>
                    </div>
                )
            })}
        </>
    );
};

export default TriggerCard;
