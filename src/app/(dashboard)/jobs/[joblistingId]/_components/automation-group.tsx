import RuleCard from "@/components/automation/rule-card";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { cn } from "@/lib/utils";
import { ApplicationType, AutomationRule, AutomationTriggerOn, StageResponseType } from "@/types";
import { Plus, WandSparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";

const AutomationGroup = ({ stage, rules, onSave, onDelete, onAdd, installedIntegrations, stages, collapsed, setCollapsed, applications }: {
    stage: StageResponseType;
    stages: StageResponseType[];
    installedIntegrations: ATSIntegration[];
    rules: AutomationRule[];
    onSave: (rule: AutomationRule) => void;
    onDelete: (ruleId: string) => void;
    onAdd: (event_type: AutomationTriggerOn['event'], stage_name: z.infer<typeof JOB_STAGES>) => void;
    collapsed?: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    applications: ApplicationType[]
}) => {
    return (
        <motion.div
            layout
            animate={{ height: collapsed ? "40px" : "auto" }}
            className="overflow-hidden min-w-[230px] w-[230px] bg-zinc-50/50 rounded-[14px] pt-1.5 border border-transparent hover:border-zinc-200 transition-colors"
        >
            {/* Stage header */}
            <motion.div
                whileHover={{ paddingInline: "8px" }}
                animate={{
                    paddingInline: !collapsed ? "8px" : "0",
                    paddingTop: collapsed ? "2.8px" : "0"
                }}
                className="flex items-center justify-between gap-2"
            >
                <div className="flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full shadow-sm"
                        style={{
                            backgroundColor: stage.color ? stage.color : "#a1a1aa"
                        }}
                    />
                    <p className="font-bold text-zinc-800 text-[11px] tracking-wider ml-1 uppercase">{stage.stage_name}</p>
                    <span className="px-1.5 py-0.5 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-500 rounded-lg ml-2">
                        {applications.filter(r => r.stage === stage.stage_name).length}
                    </span>
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "flex items-center rounded-lg transition-all",
                        collapsed ? "text-primary/60 hover:bg-white hover:text-primary" : "text-primary bg-primary/10"
                    )}
                >
                    <WandSparkles size={16} />
                </button>
            </motion.div>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="px-1 pb-2"
                    >
                        <div className="flex flex-col mt-4">
                            {rules.filter(r => r.trigger?.toStage === stage.stage_name).map(r => (
                                <RuleCard
                                    installedIntegrations={installedIntegrations}
                                    stages={stages}
                                    key={r.id}
                                    rule={r}
                                    onSave={onSave}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => onAdd("stage_changed", stage.stage_name!)}
                            className="w-full h-10 mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-primary/20 rounded-xl text-zinc-400 text-xs font-bold hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group"
                        >
                            <Plus size={14} className="group-hover:scale-110 transition-transform" />
                            Add Automation
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AutomationGroup;
