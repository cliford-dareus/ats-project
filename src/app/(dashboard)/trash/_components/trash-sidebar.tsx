"use client";

import React, {useState} from "react";
import {
    Trash2,
    RotateCcw,
    AlertTriangle,
    Calendar,
    Users,
    BriefcaseBusiness,
    FileText,
    Filter,
    Search,
    Clock
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Input} from "@/components/ui/input";

const TrashSidebar = () => {
    const [selectedFilter, setSelectedFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    const itemTypes = [
        {id: "all", name: "All Items", icon: Filter, count: 47},
        {id: "candidates", name: "Candidates", icon: Users, count: 23},
        {id: "jobs", name: "Job Listings", icon: BriefcaseBusiness, count: 12},
        {id: "applications", name: "Applications", icon: FileText, count: 8},
        {id: "interviews", name: "Interviews", icon: Calendar, count: 4}
    ];

    const timeFilters = [
        {id: "today", name: "Today", count: 5},
        {id: "week", name: "This Week", count: 18},
        {id: "month", name: "This Month", count: 24},
        {id: "older", name: "Older", count: 0}
    ];

    const quickActions = [
        {
            id: "restore-selected",
            name: "Restore Selected",
            icon: RotateCcw,
            color: "bg-green-500",
            description: "Restore selected items"
        },
        {
            id: "delete-permanently",
            name: "Delete Forever",
            icon: Trash2,
            color: "bg-red-500",
            description: "Permanently delete items"
        },
        {
            id: "empty-trash",
            name: "Empty Trash",
            icon: AlertTriangle,
            color: "bg-orange-500",
            description: "Delete all items"
        },
        {
            id: "auto-cleanup",
            name: "Auto Cleanup",
            icon: Clock,
            color: "bg-blue-500",
            description: "Configure auto-deletion"
        }
    ];

    const recentlyDeleted = [
        {
            name: "John Smith - Software Engineer",
            type: "Candidate",
            deletedBy: "Sarah Johnson",
            deletedAt: "2 hours ago",
            icon: Users
        },
        {
            name: "Senior React Developer",
            type: "Job Listing",
            deletedBy: "Mike Chen",
            deletedAt: "1 day ago",
            icon: BriefcaseBusiness
        },
        {
            name: "Application #1234",
            type: "Application",
            deletedBy: "Lisa Wang",
            deletedAt: "2 days ago",
            icon: FileText
        },
        {
            name: "Interview with Alex Brown",
            type: "Interview",
            deletedBy: "Tom Wilson",
            deletedAt: "3 days ago",
            icon: Calendar
        }
    ];

    const storageInfo = {
        used: 2.3,
        total: 10,
        unit: "GB"
    };

    const usagePercentage = (storageInfo.used / storageInfo.total) * 100;

    return (
        <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto">
            {/* Search */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Search size={20}/>
                    <span className="font-medium text-base">Search Trash</span>
                </div>
                <Input
                    placeholder="Search deleted items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
            </div>

            <Separator/>

            {/* Quick Actions */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Trash2 size={20}/>
                    <span className="font-medium text-base">Quick Actions</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                className="flex items-center justify-start gap-2 h-auto py-3"
                            >
                                <div className={`p-1.5 rounded ${action.color} text-white`}>
                                    <Icon size={14}/>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium">{action.name}</span>
                                    <span className="text-xs text-muted-foreground">{action.description}</span>
                                </div>
                            </Button>
                        );
                    })}
                </div>
            </div>

            <Separator/>

            {/* Item Type Filters */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Filter size={20}/>
                    <span className="font-medium text-base">Item Types</span>
                </div>
                <div className="space-y-1">
                    {itemTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedFilter === type.id;
                        return (
                            <div
                                key={type.id}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                }`}
                                onClick={() => setSelectedFilter(type.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon size={16}/>
                                    <span className="text-sm">{type.name}</span>
                                </div>
                                <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                    {type.count}
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator/>

            {/* Time Filters */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Calendar size={20}/>
                    <span className="font-medium text-base">Deleted</span>
                </div>
                <div className="space-y-1">
                    {timeFilters.map((filter) => (
                        <div
                            key={filter.id}
                            className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted cursor-pointer transition-colors"
                        >
                            <span className="text-sm">{filter.name}</span>
                            <Badge variant="secondary" className="text-xs">
                                {filter.count}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>

            <Separator/>

            {/* Recently Deleted */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20}/>
                    <span className="font-medium text-base">Recently Deleted</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentlyDeleted.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={index}
                                className="p-3 rounded border hover:bg-muted cursor-pointer transition-colors"
                            >
                                <div className="flex items-start gap-2">
                                    <Icon size={16} className="mt-0.5 text-muted-foreground"/>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {item.type} • Deleted by {item.deletedBy}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{item.deletedAt}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator/>

            {/* Storage Info */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={20}/>
                    <span className="font-medium text-base">Storage</span>
                </div>
                <div className="p-3 rounded border bg-muted/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Trash Storage</span>
                        <span className="text-sm font-medium">
              {storageInfo.used} / {storageInfo.total} {storageInfo.unit}
            </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{width: `${usagePercentage}%`}}
                        ></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                        Items are automatically deleted after 30 days
                    </div>
                </div>
            </div>

            {/* Warning */}
            <div className="mt-auto p-3 rounded border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-orange-500 mt-0.5"/>
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                        <div className="font-medium">Auto-deletion enabled</div>
                        <div>Items older than 30 days are permanently deleted</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrashSidebar;
