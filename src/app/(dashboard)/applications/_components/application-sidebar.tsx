"use client";

import React, { useEffect, useState } from "react";

import {Archive, BadgeCheck, Building2, CheckCircle, Clock, Eye, FileText, Phone, Zap} from "lucide-react";
import {DEPARTMENTS} from "@/lib/constant";
import AppSidebarFilter from "@/components/sidebar/app-sidebar-filter";
import { JOB_STAGES } from "@/zod";
import { get_application_stage_counts_action } from "@/server/actions/application_actions";

// L-9–L-11: status values are the canonical JOB_STAGES names (mixed-case,
// e.g. "New Candidate") with matching labels — the old uppercase values
// ("APPLIED", "NEW CANDIDATE" labelled "Pending") never matched a real
// stage name, so the filter silently matched nothing. Counts are real
// per-stage application counts from the DB (summed across the org's jobs),
// fetched on mount; no count renders until they load.
const STAGE_META: Record<
    (typeof JOB_STAGES.options)[number],
    { label: string; icon: typeof CheckCircle; color: string }
> = {
    "New Candidate": { label: "New Candidate", icon: Clock, color: "bg-yellow-500" },
    Screening: { label: "Screening", icon: Eye, color: "bg-blue-500" },
    "Phone Interview": { label: "Phone Interview", icon: Phone, color: "bg-red-500" },
    Interview: { label: "Interview", icon: Archive, color: "bg-muted-foreground/50" },
    Offer: { label: "Offer", icon: BadgeCheck, color: "bg-emerald-500" },
    Applied: { label: "Applied", icon: CheckCircle, color: "bg-green-500" },
    Drafted: { label: "Drafted", icon: FileText, color: "bg-slate-500" },
};

const ApplicationsSidebar = () => {
    const [counts, setCounts] = useState<Record<string, number> | null>(null);

    useEffect(() => {
        let cancelled = false;
        get_application_stage_counts_action().then((result) => {
            if (cancelled || !Array.isArray(result)) return;
            const byStage: Record<string, number> = {};
            for (const row of result as { stages?: string | null; count?: number }[]) {
                if (!row.stages) continue;
                byStage[row.stages] = (byStage[row.stages] ?? 0) + (row.count ?? 0);
            }
            setCounts(byStage);
        }).catch(() => {
            // Counts are nice-to-have — a failed fetch leaves them hidden
            // rather than breaking the sidebar.
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const config = [
        {
            id: "status",
            title: "Status",
            icon: Zap,
            items: JOB_STAGES.options.map((stage) => {
                const meta = STAGE_META[stage];
                return {
                    value: stage,
                    label: meta.label,
                    icon: meta.icon,
                    color: meta.color,
                    ...(counts ? { count: counts[stage] ?? 0 } : {}),
                };
            }),
        },
        {
            id: "department",
            title: "Department",
            icon: Building2,
            items: DEPARTMENTS,
        }
    ];

    return (
        <aside className="flex flex-col bg-card flex-shrink-0 h-[calc(100vh-135px)]">
          <AppSidebarFilter config={config} />
        </aside>
    );
};

export default ApplicationsSidebar;
