"use client";

import { useState } from "react";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { AutomationRule, StageResponseType } from "@/types";
import { Move, Settings2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import RuleEditorModal from "./rule-editor-modal";

export const ACTION_TYPES = [
    { type: "add_note", label: "Add note", icon: "📝", color: "#6366f1", description: "Append a note to the candidate profile" },
    { type: "send_sms", label: "Send SMS", icon: "💬", color: "#10b981", description: "Send a text message to candidate or team" },
    { type: "send_email", label: "Send email", icon: "📧", color: "#0ea5e9", description: "Send a custom email" },
    { type: "fire_integration", label: "Run integration", icon: "⚡", color: "#f59e0b", description: "Trigger a connected plugin" },
    { type: "move_stage", label: "Move stage", icon: "➡️", color: "#8b5cf6", description: "Automatically advance the candidate" },
];

export const DELAY_PRESETS = [
    { value: 0, unit: "minutes", label: "Immediately" },
    { value: 1, unit: "minutes", label: "After 1 min" },
    { value: 5, unit: "minutes", label: "After 5 min" },
    { value: 15, unit: "minutes", label: "After 15 min" },
    { value: 30, unit: "minutes", label: "After 30 min" },
    { value: 1, unit: "hours", label: "After 1 hr" },
    { value: 2, unit: "hours", label: "After 2 hr" },
    { value: 24, unit: "hours", label: "After 24 hr" },
    { value: 1, unit: "days", label: "After 1 day" },
    { value: 3, unit: "days", label: "After 3 days" },
];

export type ActionMetaType = typeof ACTION_TYPES[number]

const RuleCard = ({ rule, onSave, onDelete, stages, installedIntegrations }: {
    rule: AutomationRule;
    onSave: (rule: AutomationRule) => void;
    onDelete: (ruleId: string) => void;
    stages: StageResponseType[];
    installedIntegrations: ATSIntegration[];
}) => {
    const [editing, setEditing] = useState(!rule.name);
    const [draft, setDraft] = useState(rule);
    const actionMeta = ACTION_TYPES.find(a => a.type === draft.action.type);
    const delayMeta = DELAY_PRESETS.find(d => d.value === draft.delay.value && d.unit === draft.delay.unit)
        ?? { label: `After ${draft.delay.value} ${draft.delay.unit}` };
    const stageMeta = stages.find(s => s.stage_name === draft.trigger?.toStage);

    const update = (patch: Partial<AutomationRule>) => setDraft(d => ({ ...d, ...patch, updatedAt: new Date().toISOString() }));

    const handleSave = () => {
        if (!draft.name.trim()) return;
        console.log(draft)
        onSave(draft);
        setEditing(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-zinc-200 p-3 rounded-xl mb-2 group hover:border-zinc-300 transition-all shadow-sm"
            >
                {/* Action Section */}
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{rule.action.type}</span>
                    <button
                        onClick={() => onDelete(rule.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>

                <p className="text-xs font-medium text-zinc-700">{draft.name}</p>

                <div className="flex items-center gap-2 bg-slate-50/50 rounded-2xl mt-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mt-2">
                            <div className="text-[10px] text-slate-400">
                                <span className="inline-flex items-center gap-1 uppercase">
                                    <Move size={12} className="inline-block align-middle mr-1" />
                                    {stageMeta?.stage_name ?? draft.trigger.toStage}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-brand-100 border border-white flex items-center justify-center">
                            <Settings2 size={10} className="text-brand-600" />
                        </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium italic">{delayMeta.label}</span>
                </div>

                {/*<div className="flex items-center justify-between mt-2">
                    <Switch
                        className=""
                        checked={draft.enabled} onChange={v => { update({ enabled: v }); onSave({ ...draft, enabled: v }); }} />
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                            <Edit3 className="text-slate-400" size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)} >
                            <Trash2 className="text-slate-400" size={12} />
                        </Button>
                    </div>
                </div>*/}
            </motion.div>

            <RuleEditorModal
                isOpen={editing}
                setIsOpen={setEditing}
                actionMeta={actionMeta!}
                handleSave={handleSave}
                installedIntegrations={installedIntegrations}
                stages={stages}
                rule={rule}
                draft={draft}
                setDraft={setDraft}
                update={update}
            />
        </>
    )
};

export default RuleCard;
