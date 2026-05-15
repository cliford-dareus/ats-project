import { useState, useCallback } from "react";
import { useRules, useInstalledIntegrations } from "@/hooks/use-plugin-registry";
import type { ApplicationType, AutomationRule, AutomationTriggerOn, StageResponseType } from "@/types";
import AutomationGroup from "./automation-group";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import { automationEngine } from "@/lib/automation-engine";
import {deleteJobAutomationRule, saveJobAutomationRule} from "@/server/actions/job-listings-actions";

const newRule = (job_id: number, stage_name: z.infer<typeof JOB_STAGES>, event_type: AutomationTriggerOn['event']): AutomationRule => {
    return {
        id: `Rule_${Date.now()}`,
        name: "",
        job_id,
        enabled: true,
        trigger: { event: event_type, toStage: stage_name },
        delay: { value: 0, unit: "minutes" },
        action: { type: "add_note", content: "" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
};

const AutomationBuilder = ({ job_id, stages, applications }: {
    job_id: number;
    stages: StageResponseType[];
    applications: ApplicationType[]
}) => {
    const rules = useRules(job_id);
    const installed_integrations = useInstalledIntegrations();
    const [collapsed, setCollapsed] = useState(true);
    
    const handleSave = useCallback(async (rule: AutomationRule) => {
        const saved = await saveJobAutomationRule(job_id, rule);
        automationEngine.upsertRule(saved)
    }, [job_id]);

    const handleDelete = useCallback(async (ruleId: string) => {
        await deleteJobAutomationRule(job_id, ruleId);
        automationEngine.deleteRule(job_id, ruleId)
    }, [job_id]);

    const handleAdd = useCallback((event_type: AutomationTriggerOn['event'], stage_name: z.infer<typeof JOB_STAGES>) => {
        const rule = newRule(job_id, stage_name, event_type);
        automationEngine.upsertRule(rule);
    }, [job_id]);

    const rulesByStage = (stage_name: z.infer<typeof JOB_STAGES>) => rules.filter(r =>
        r.trigger.event === "stage_changed" && r.trigger.toStage === stage_name
    );

    return (
        <div className="w-full">
            <div className="flex gap-4 flex-1 ">
                {
                    stages.map((stage) => (
                        <AutomationGroup
                            key={stage.id}
                            stage={stage}
                            rules={rulesByStage(stage.stage_name!)}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onAdd={handleAdd}
                            stages={stages}
                            installedIntegrations={installed_integrations}
                            collapsed={collapsed}
                            setCollapsed={setCollapsed}
                            applications={applications}
                        />
                    ))
                }
            </div>
        </div >
    );
};

export default AutomationBuilder;
