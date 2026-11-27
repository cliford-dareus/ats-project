"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Plus,
    FileText,
    Settings,
    Download,
    Upload
} from "lucide-react";
import Link from "next/link";
import { Permission } from "@/lib/permissions";
import { useHasPermission } from "@/lib/use-permission";

interface QuickAction {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color: string;
    permission?: Permission;
};

const QuickActions = () => {
    const hasPermission = useHasPermission();
    // Only destinations that exist. There is no manual add-candidate page
    // (candidates arrive via applications or bulk import) and no
    // /interviews/new route (scheduling happens per application), so those
    // two actions were dead links and are gone.
    const allActions: QuickAction[] = [
        {
            title: "Post New Job",
            description: "Create a new job listing",
            icon: Plus,
            href: "/jobs/new",
            color: "bg-blue-500 hover:bg-blue-600",
            permission: "job:create"
        },
        {
            title: "View Applications",
            description: "Review pending applications",
            icon: FileText,
            href: "/applications",
            color: "bg-orange-500 hover:bg-orange-600",
            permission: "application:view"
        },
        {
            title: "Bulk Import",
            description: "Import candidates from CSV",
            icon: Upload,
            href: "/candidates/import",
            color: "bg-indigo-500 hover:bg-indigo-600",
            permission: "candidate:create"
        },
        {
            title: "Reports",
            description: "Generate recruitment reports",
            icon: Download,
            href: "/reports",
            color: "bg-pink-500 hover:bg-pink-600",
            permission: "report:view"
        }
    ];

    const actions = allActions.filter((action) => !action.permission || hasPermission(action.permission));

    return (
        <div className="col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Quick Actions
                    </CardTitle>
                    <CardDescription>
                        Common tasks and shortcuts for efficient recruitment management
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {actions.map((action, index) => (
                            <Link key={index} href={action.href}>
                                <div className="group relative p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                                            <action.icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700 truncate">
                                                {action.title}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {action.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>

    );
};

export default QuickActions;
