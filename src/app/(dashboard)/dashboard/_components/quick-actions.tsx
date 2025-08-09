"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Users,
    Calendar,
    FileText,
    Settings,
    Download,
    Upload
} from "lucide-react";
import Link from "next/link";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UpcomingInterview } from './dashboard';

interface QuickAction {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color: string;
    badge?: string;
};

const QuickActions = ({upcomingInterviews}: {upcomingInterviews: UpcomingInterview[]}) => {
    const actions: QuickAction[] = [
        {
            title: "Post New Job",
            description: "Create a new job listing",
            icon: Plus,
            href: "/jobs/new",
            color: "bg-blue-500 hover:bg-blue-600",
            badge: "Popular"
        },
        {
            title: "Add Candidate",
            description: "Add a new candidate to the system",
            icon: Users,
            href: "/candidates/new",
            color: "bg-green-500 hover:bg-green-600"
        },
        {
            title: "Schedule Interview",
            description: "Schedule interviews with candidates",
            icon: Calendar,
            href: "/interviews/new",
            color: "bg-purple-500 hover:bg-purple-600"
        },
        {
            title: "View Applications",
            description: "Review pending applications",
            icon: FileText,
            href: "/applications",
            color: "bg-orange-500 hover:bg-orange-600",
            badge: "12 pending"
        },
        {
            title: "Bulk Import",
            description: "Import candidates from CSV",
            icon: Upload,
            href: "/candidates/import",
            color: "bg-indigo-500 hover:bg-indigo-600"
        },
        {
            title: "Reports",
            description: "Generate recruitment reports",
            icon: Download,
            href: "/reports",
            color: "bg-pink-500 hover:bg-pink-600"
        }
    ];

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {actions.map((action, index) => (
                            <Link key={index} href={action.href}>
                                <div className="group relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md cursor-pointer">
                                    <div className="flex flex-col">
                                        <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-200 self-start`}>
                                            <action.icon className="h-4 w-4" />
                                        </div>
                                        {/* {action.badge && (
                                            <Badge variant="secondary" className="text-xs">
                                                {action.badge}
                                            </Badge>
                                        )} */}
                                    {/* <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                                        {action.title}
                                    </p> */}
                                    </div>
                                    {/* <div className="mt-3">
                                        <p className="text-sm text-gray-500 mt-1">
                                            {action.description}
                                        </p>
                                    </div> */}
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* <Separator className="my-4" />

            <Card className="md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Upcoming Interviews</CardTitle>
                        <CardDescription>Scheduled for the next 7 days</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                        <Calendar className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {upcomingInterviews.slice(0, 4).map((interview) => (
                        <div key={interview.id} className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={interview.candidateAvatar} />
                                <AvatarFallback>
                                    {interview.candidateName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {interview.candidateName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {interview.jobTitle}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium">
                                    {interview.time.toLocaleDateString()}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                    {interview.type}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    <Button variant="ghost" className="w-full" asChild>
                        <Link href="/interviews">View all interviews</Link>
                    </Button>
                </CardContent>
            </Card> */}
        </div>

    );
};

export default QuickActions;
