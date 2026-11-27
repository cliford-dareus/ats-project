"use client";

import React, { useEffect, useState } from "react";
import {
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Archive,
    Eye,
    Zap,
    DollarSign,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/constant";
import AppSidebarFilter from "@/components/sidebar/app-sidebar-filter";
import { JOB_SALARY_RANGES } from "@/zod";
import { get_jobs_sidebar_counts_action } from "@/server/actions/job-listings-actions";

const JobListingSidebar = () => {
    // B16: real counts from the DB (live OPEN jobs + live candidates for
    // the session org), fetched on mount like the applications sidebar
    // does for its stage counts. No count renders until they load, and
    // there are no trend/delta figures — no real source exists for them.
    const [counts, setCounts] = useState<{ activeJobs: number; candidates: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        get_jobs_sidebar_counts_action().then((result) => {
            if (cancelled || !result || typeof result !== "object" || "error" in result) return;
            setCounts(result as { activeJobs: number; candidates: number });
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
            items: [
                { value: "OPEN", label: "Open", icon: CheckCircle, color: "bg-green-500" },
                { value: "PENDING", label: "Pending", icon: Clock, color: "bg-yellow-500"},
                { value: "DRAFT", label: "Draft", icon: Eye, color: "bg-blue-500"},
                { value: "CLOSED", label: "Closed", icon: XCircle, color: "bg-red-500"},
                { value: "ARCHIVED", label: "Archived", icon: Archive, color: "bg-muted-foreground/50"},
            ],
        },
        {
            id: "type",
            title: "Type",
            icon: Clock,
            items: [
                { value: "FULL_TIME", label: "Full Time", icon: CheckCircle, color: "bg-green-500" },
                { value: "PART_TIME", label: "Part Time", icon: CheckCircle, color: "bg-green-500" },
                { value: "REMOTE", label: "Remote", icon: CheckCircle, color: "bg-green-500" },
                { value: "INTERNSHIP", label: "Internship", icon: CheckCircle, color: "bg-green-500" },
                { value: "CONTRACT", label: "Contract", icon: CheckCircle, color: "bg-green-500" },
            ],
        },
        {
            id: "salary",
            title: "Salary",
            icon: DollarSign,
            items: JOB_SALARY_RANGES.map((range) => ({
                value: range.value,
                label: range.label,
                icon: DollarSign,
                color: "bg-green-500",
            })),
        },
        {
            id: "department",
            title: "Department",
            icon: Building2,
            items: DEPARTMENTS as string[],
        }
    ];

    return (
        <aside className="flex flex-col bg-card flex-shrink-0 h-[calc(100vh-135px)]">
          <AppSidebarFilter config={config}/>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Active Jobs</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-foreground">{counts ? counts.activeJobs : "–"}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Candidates</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-foreground">{counts ? counts.candidates : "–"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default JobListingSidebar;
