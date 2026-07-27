import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import ActionEditor from "./action-editor";
import { ACTION_TYPES, ActionMetaType, DELAY_PRESETS } from "./rule-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AutomationAction, AutomationRule, StageResponseType } from "@/types";
import { Dispatch, SetStateAction } from "react";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { Button } from "../ui/button";
import { BriefcaseBusiness } from "lucide-react";

const RuleEditorModal = ({
    isOpen,
    setIsOpen,
    rule,
    draft,
    setDraft,
    update,
    handleSave,
    actionMeta,
    stages,
    installedIntegrations
}: {
    isOpen: boolean
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    rule: AutomationRule;
    draft: AutomationRule;
    setDraft: Dispatch<SetStateAction<AutomationRule>>
    update: (path: Partial<AutomationRule>) => void;
    handleSave: (rule: AutomationRule) => void;
    actionMeta: ActionMetaType;
    stages: StageResponseType[];
    installedIntegrations: ATSIntegration[]
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-12 h-12 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <BriefcaseBusiness size={24} />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl uppercase">Create Automation</DialogTitle>
                        <DialogDescription>Quickly add a automation to a job</DialogDescription>
                    </div>
                </DialogHeader>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <Switch checked={draft.enabled} onCheckedChange={v => update({ enabled: v })} />
                    <Input value={draft.name} onChange={v => update({ name: v.target.value })}
                        placeholder="Automation name…" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                    {/* WHEN */}
                    <div>
                        <Label>WHEN</Label>
                        <Select
                            value={draft.trigger?.toStage ?? ""}
                            onValueChange={v => update({ trigger: { ...draft.trigger, toStage: v } as AutomationRule["trigger"] })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map(s => (
                                    <SelectItem key={s.id} value={s.stage_name!}>
                                        → {s.stage_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* WAIT */}
                    <div>
                        <Label>WAIT</Label>
                        <Select
                            value={`${draft.delay.value}:${draft.delay.unit}`}
                            onValueChange={v => {
                                const [val, unit] = v.split(":");
                                update({ delay: { value: Number(val), unit } as AutomationRule["delay"] } as Partial<AutomationRule>);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DELAY_PRESETS.map(p => (
                                    <SelectItem key={`${p.value}:${p.unit}`} value={`${p.value}:${p.unit}`}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* THEN */}
                    <div>
                        <Label>THEN</Label>
                        <Select
                            value={draft.action.type}
                            onValueChange={v => update({ action: { type: v } as AutomationAction })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACTION_TYPES.map(a => (
                                    <SelectItem key={a.type} value={a.type}>
                                        {a.icon} {a.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Action editor */}
                <div className="bg-card border rounded-md p-4 mt-4">
                    <div className="text-[10px] text-[#444] tracking-widest mb-3">
                        {actionMeta?.icon} {actionMeta?.label?.toUpperCase()} · {actionMeta?.description}
                    </div>
                    <ActionEditor
                        installedIntegrations={installedIntegrations}
                        action={draft.action} onChange={action => update({ action })}
                        stages={stages}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2">
                    <Button
                        className="!py-2 border rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2"
                        onClick={() => {
                            setDraft(rule);
                            setIsOpen(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="!py-2 border rounded-md text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2"
                        onClick={() => handleSave(draft)} disabled={!draft.name.trim()}
                    >
                        Save rule
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
};

export default RuleEditorModal;
