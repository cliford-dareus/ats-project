"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { ATSIntegration } from "@/lib/plugin-interfaces";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { StageResponseType } from "@/types";
import type { PluginAuthState } from "@/types";
import { pluginRegistry } from "@/lib/plugin-registry";
import { usePluginSystem } from "@/providers/plugin-system-provider";

// Stable server snapshot for the auth-states store below.
const EMPTY_AUTH_STATES: ReadonlyMap<string, PluginAuthState> = new Map();

/**
 * All providers' auth states, reactively. useProviderAuthState() only
 * covers one providerId, and hooks can't be called in a loop over the
 * integration list — so snapshot the whole state map (same stability
 * trick as useInstalledIntegrations: keep the previous reference while
 * every status is unchanged).
 */
function useAllAuthStates(): ReadonlyMap<string, PluginAuthState> {
    const snapshotRef = useRef<ReadonlyMap<string, PluginAuthState>>(EMPTY_AUTH_STATES);

    const getSnapshot = useCallback((): ReadonlyMap<string, PluginAuthState> => {
        const next = pluginRegistry.stateManager.getAllStates();
        const prev = snapshotRef.current;

        let stable = next.size === prev.size;
        if (stable) {
            for (const [id, state] of next) {
                if (prev.get(id)?.status !== state.status) {
                    stable = false;
                    break;
                }
            }
        }

        if (!stable) snapshotRef.current = new Map(next);
        return snapshotRef.current;
    }, []);

    return useSyncExternalStore(
        (cb) => pluginRegistry.stateManager.subscribe(cb),
        getSnapshot,
        () => EMPTY_AUTH_STATES,
    );
}


const ActionEditor = ({ action, onChange, stages, installedIntegrations }: {
    action: any;
    onChange: (action: any) => void;
    stages: StageResponseType[];
    installedIntegrations: ATSIntegration[];
}) => {
    const update = (patch: Record<string, unknown>) => onChange({ ...action, ...patch });

    const recipientOptions = [
        { value: "candidate", label: "Candidate" },
        { value: "recruiter", label: "Recruiter" },
        { value: "hiring_manager", label: "Hiring Manager" },
    ];

    const stageOptions = stages.map(s => ({ value: s.stage_name!, label: s.stage_name! }));

    const { isEnabled } = usePluginSystem();
    const authStates = useAllAuthStates();

    // Only offer integrations that can actually run: the plugin must be
    // enabled for this org (flags), the provider must have been verified
    // this session, and the integration toggle must be on. Anything else
    // used to be selectable and then failed silently at dispatch.
    const integrationOptions = installedIntegrations
        .filter((i) =>
            isEnabled(i.providerId) &&
            authStates.get(i.providerId)?.status === "authenticated" &&
            pluginRegistry.isIntegrationEnabled(i.id),
        )
        .map(i => ({
            value: `${i.providerId}:${i.id}`,
            label: i.name,
        }));

    const TokenHint = () => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {["{{candidate.name}}", "{{candidate.email}}", "{{job.title}}", "{{stage}}"].map(t => (
                <span
                    key={t}
                    className="text-[10px] py-0.5 px-2 rounded-md bg-primary border text-white cursor-default"
                >
                    {t}
                </span>
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
            <div className="flex items-center gap-2">
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
        // A saved target that no longer passes the filter (plugin disabled
        // / uninstalled / never verified this session, or the integration
        // toggle is off) — the rule would fail silently at dispatch.
        const currentUnavailable = Boolean(current) &&
            !integrationOptions.some(opt => opt.value === current);
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                {integrationOptions.length === 0 && !current && (
                    <p style={{ fontSize: 11, color: "#b45309" }}>
                        ⚠ No integrations can run right now — enable the plugin in
                        Settings and connect its API key this session, then check
                        the integration is toggled on.
                    </p>
                )}
                {currentUnavailable && (
                    <p style={{ fontSize: 11, color: "#b45309" }}>
                        ⚠ The saved integration for this rule is unavailable — its
                        plugin is disabled, not connected this session, or the
                        integration is turned off. Pick another integration or
                        re-enable it in Settings.
                    </p>
                )}
            </div>
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
