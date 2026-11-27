"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Trash2,
    AlertTriangle,
    Calendar,
    Users,
    BriefcaseBusiness,
    FileText,
    Filter,
    Search,
    Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { get_trash_summary_action } from "@/server/actions/trash-actions";
import { EmptyTrashButton } from "./trash-item-actions";
import type { TrashCounts, TrashItem, TrashItemType } from "@/server/queries/drizzle/trash";

const TYPE_ICONS: Record<TrashItemType, typeof Users> = {
    job: BriefcaseBusiness,
    candidate: Users,
    application: FileText,
};

const TYPE_LABELS: Record<TrashItemType, string> = {
    job: "Job Listing",
    candidate: "Candidate",
    application: "Application",
};

const relativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
};

type TrashSummary = {
    counts: TrashCounts;
    recent: TrashItem[];
};

/**
 * Contextual sidebar for the Trash page. Counts and recently-deleted items
 * are real (loaded from get_trash_summary_action) — nothing here is
 * hardcoded. The type filter navigates the trash page (?type=...); the
 * search box filters the recently-deleted list. Refetches on navigation
 * and whenever a trash action on the page dispatches "trash:changed".
 * There is no automatic deletion — the old auto-cleanup / storage
 * sections were fake and are gone.
 */
const TrashSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeFilter = searchParams.get("type") ?? "all";
    const [searchTerm, setSearchTerm] = useState("");
    const [summary, setSummary] = useState<TrashSummary | null>(null);

    const load = useCallback(async () => {
        const result = await get_trash_summary_action();
        if (result && !("error" in result)) setSummary(result);
    }, []);

    useEffect(() => {
        load();
    }, [load, pathname]);

    useEffect(() => {
        window.addEventListener("trash:changed", load);
        return () => window.removeEventListener("trash:changed", load);
    }, [load]);

    const counts = summary?.counts ?? { jobs: 0, candidates: 0, applications: 0 };
    const total = counts.jobs + counts.candidates + counts.applications;
    const recent = (summary?.recent ?? []).filter((item) => {
        if (!searchTerm.trim()) return true;
        const needle = searchTerm.toLowerCase();
        return item.title.toLowerCase().includes(needle) || item.subtitle.toLowerCase().includes(needle);
    });

    const itemTypes = [
        { id: "all", name: "All Items", icon: Filter, count: total },
        { id: "candidates", name: "Candidates", icon: Users, count: counts.candidates },
        { id: "jobs", name: "Job Listings", icon: BriefcaseBusiness, count: counts.jobs },
        { id: "applications", name: "Applications", icon: FileText, count: counts.applications },
    ];

    const goToFilter = (id: string) => {
        router.push(id === "all" ? "/trash" : `/trash?type=${id}`);
    };

    const goToItemType = (item: TrashItem) => {
        const filter = item.type === "job" ? "jobs" : item.type === "candidate" ? "candidates" : "applications";
        router.push(`/trash?type=${filter}`);
    };

    return (
        <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto">
            {/* Search */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Search size={20} />
                    <span className="font-medium text-base">Search Trash</span>
                </div>
                <Input
                    placeholder="Search deleted items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
            </div>

            <Separator />

            {/* Empty Trash */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Trash2 size={20} />
                    <span className="font-medium text-base">Quick Actions</span>
                </div>
                <EmptyTrashButton disabled={total === 0} />
                <p className="text-xs text-muted-foreground">
                    Permanently deletes everything in Trash you have permission to delete.
                </p>
            </div>

            <Separator />

            {/* Item Type Filters */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Filter size={20} />
                    <span className="font-medium text-base">Item Types</span>
                </div>
                <div className="space-y-1">
                    {itemTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = activeFilter === type.id;
                        return (
                            <div
                                key={type.id}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                }`}
                                onClick={() => goToFilter(type.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon size={16} />
                                    <span className="text-sm">{type.name}</span>
                                </div>
                                <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                    {summary ? type.count : "…"}
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Recently Deleted */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-medium text-base">Recently Deleted</span>
                </div>
                {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">
                        {summary === null ? "Loading…" : "Nothing in Trash yet."}
                    </p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {recent.map((item) => {
                            const Icon = TYPE_ICONS[item.type];
                            return (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    className="p-3 rounded border hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => goToItemType(item)}
                                >
                                    <div className="flex items-start gap-2">
                                        <Icon size={16} className="mt-0.5 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{item.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {TYPE_LABELS[item.type]}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {relativeTime(new Date(item.deletedAt))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Separator />

            {/* Warning */}
            <div className="mt-auto p-3 rounded border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-orange-500 mt-0.5" />
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                        <div className="font-medium">No auto-deletion</div>
                        <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            Items stay in Trash until you restore or delete them
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrashSidebar;
