"use client";

import React from "react";
import { motion } from "framer-motion";
import { StageResponseType, TriggerResponseType } from "@/types";
import { GitCompareArrows, Network, Send, Zap } from "lucide-react"
import { ConfigType } from "@/plugins/smart-trigger/types";

type Props = {
    stage: StageResponseType;
};

const SmartTriggerCard = ({ stage }: Props) => {
    const triggers = JSON.parse(stage.trigger) as TriggerResponseType[];
    return (
        <>
            {triggers.map((trigger: TriggerResponseType) => {
                const config = trigger?.config as unknown as ConfigType;

                if (trigger.action_type === null) {
                    return (
                        <motion.div
                            key={trigger.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-4 px-2 bg-white border border-dashed border-slate-300 rounded-2xl"
                        >
                            <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-50 rounded-xl">
                                <Zap size={30} className="text-slate-300" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">No triggers yet</h3>

                        </motion.div>)
                };

                return (
                    <div key={trigger.id} className="p-2 mb-4 bg-white border border-dashed border-slate-300 rounded-xl">
                        <div className="relative">
                            {/* Action Section */}
                            <div className="flex items-center gap-2  bg-blue-50/20 rounded-xl border border-blue-100/50">
                                <div className="w-6 h-6 rounded-lg bg-blue-600 shadow-lg shadow-blue-100 flex items-center justify-center text-[9px] font-black text-white">
                                    <Network size={12} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {trigger.action_type === 'move' ? <GitCompareArrows size={14} className="text-blue-600" /> : <Send size={14} className="text-blue-600" />}
                                        <p className="text-xs font-bold text-slate-900">
                                            {trigger.action_type === 'MOVE' && `Move: ${config?.condition?.target}`}
                                            {trigger.action_type === 'EMAIL' && `Send Email`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50/50 rounded-2xl mt-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-slate-400">
                                            {trigger.action_type === 'MOVE' && (
                                                <>
                                                    <span className="text-red-400 mr-2 font-bold">IF</span>
                                                    <span>{`${config?.condition?.type} : ${config?.condition?.location}`}</span>
                                                </>
                                            )}

                                            {trigger.action_type === 'EMAIL' && (
                                                <>
                                                    <span className="text-red-400 mr-2 font-bold uppercase">Subject</span>
                                                    <span className="">{config?.email?.subject}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </>
    );
};

export default SmartTriggerCard;
