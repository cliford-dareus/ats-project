import { ATSIntegration } from "@/lib/plugin-interfaces";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { StageResponseType } from "@/types";


const ActionEditor = ({ action, onChange, stages, installedIntegrations }: {
    action: any;
    onChange: (action: any) => void;
    stages: StageResponseType[];
    installedIntegrations: ATSIntegration[];
}) => {
    const update = (patch) => onChange({ ...action, ...patch });

    const recipientOptions = [
        { value: "candidate", label: "Candidate" },
        { value: "recruiter", label: "Recruiter" },
        { value: "hiring_manager", label: "Hiring Manager" },
    ];

    const stageOptions = stages.map(s => ({ value: s.stage_name!, label: s.stage_name! }));

    const integrationOptions = installedIntegrations.map(i => ({
        value: `${i.providerId}:${i.id}`,
        label: i.name,
    }));

    const TokenHint = () => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {["{{candidate.name}}", "{{candidate.email}}", "{{job.title}}", "{{stage}}"].map(t => (
                <span key={t} style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 4,
                    background: "#1a1a1a", border: "1px solid #2a2a2a",
                    color: "#555", fontFamily: "monospace", cursor: "default",
                }}>{t}</span>
            ))}
        </div>
    );

    if (action.type === "add_note") return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Textarea
                value={action.content ?? ""}
                onChange={v => update({ content: v.target.value })}
                placeholder="Note content… supports {{candidate.name}}, {{job.title}}"
                rows={4}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch checked={action.pinned ?? false} onCheckedChange={v => update({ pinned: v })} />
                <span style={{ fontSize: 12, color: "#666" }}>Pin this note</span>
            </div>
            <TokenHint />
        </div>
    );

    if (action.type === "send_sms") return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Select value={action.to ?? "candidate"} onValueChange={v => update({ to: v })}>
                <SelectContent>
                    {recipientOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Textarea
                value={action.message ?? ""}
                onChange={v => update({ message: v.target.value })}
                placeholder="SMS message… supports {{candidate.name}}"
                rows={3}
            />
            <TokenHint />
        </div>
    );

    if (action.type === "send_email") return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Select value={action.to ?? "candidate"} onValueChange={v => update({ to: v })}>
                <SelectContent>
                    {recipientOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                value={action.subject ?? ""}
                onChange={v => update({ subject: v.target.value })}
                placeholder="Subject: {{candidate.name}} — next steps"
            />
            <Textarea
                value={action.body ?? ""}
                onChange={v => update({ body: v.target.value })}
                placeholder="Email body…"
                rows={5}
            />
            <TokenHint />
        </div>
    );

    if (action.type === "fire_integration") {
        const current = action.providerId && action.integrationId
            ? `${action.providerId}:${action.integrationId}` : "";
        return (
            <Select
                value={current}
                onValueChange={v => {
                    const [providerId, integrationId] = v.split(":");
                    update({ providerId, integrationId });
                }}
            >
                <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Select integration…" />
                </SelectTrigger>
                <SelectContent>
                    {integrationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (action.type === "move_stage") return (
        <Select
            value={action.toStage ?? ""}
            onValueChange={v => update({ toStage: v })}
        >
            <SelectTrigger className="w-full max-w-48">
                    {/*<SelectValue placeholder="Select integration…" />*/}
                </SelectTrigger>
            <SelectContent>
                {stageOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return null;
};

export default ActionEditor;
