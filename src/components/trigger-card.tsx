"use client";

import React from "react";
import { motion } from "framer-motion";
import { StageResponseType, TriggerResponseType } from "@/types";
import { ArrowRight, GitCompareArrows, Network, Send, Zap } from "lucide-react"
import { ConfigType } from "@/lib/smart-trigger/types";

type Props = {
    stage: StageResponseType;
};

const TriggerCard = ({ stage }: Props) => {
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
                            className="text-center py-2 bg-white border border-dashed border-slate-300 rounded-3xl"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                                <Zap size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No triggers yet</h3>
                            {/* <p className="text-slate-500 max-w-xs mx-auto mt-2">Create your first automation rule to start optimizing your workflow.</p> */}
                        </motion.div>)
                };

                return (
                    <div key={trigger.id} className="px-2 py-4 mb-4 bg-white border border-dashed border-slate-300 rounded-3xl">
                        <div className="space-y-4">
                            {/* Condition Section */}
                            <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                    IF
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="p-1 bg-white rounded-md shadow-sm border border-slate-100">
                                        <Network size={14} className="text-blue-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Condition Type</span>
                                        <span className="text-xs font-medium text-slate-700">{config.condition.type}</span>
                                    </div>
                                    <ArrowRight size={12} className="text-slate-300" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Location</span>
                                        <span className="text-xs font-medium text-slate-700">{config.condition.location}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Section */}
                            <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">
                                    THEN
                                </div>
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="p-1 bg-white rounded-md shadow-xs border border-blue-100">
                                        {trigger.action_type === 'move' ? (
                                            <GitCompareArrows size={14} className="text-blue-600" />
                                        ) : (
                                            <Send size={14} className="text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Action</span>
                                        <span className="text-xs font-medium text-slate-700 capitalize">{trigger.action_type}</span>
                                    </div>
                                    <ArrowRight size={12} className="text-blue-300" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Target</span>
                                        <span className="text-xs font-medium text-slate-700">{config.condition.target}</span>
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

export default TriggerCard;
