"use client";

import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Target,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

interface SummaryItem {
    title: string;
    value: string | number;
    status: 'success' | 'warning' | 'error' | 'info';
    description: string;
    action?: {
        label: string;
        href: string;
    };
};

interface Props {
    className?: string;
};

const DashboardSummary = ({className}: Props) => {
    const summaryItems: SummaryItem[] = [
        {
            title: "Applications to Review",
            value: 23,
            status: 'warning',
            description: "Applications waiting for initial screening",
            action: {
                label: "Review Now",
                href: "/applications?status=pending"
            }
        },
        {
            title: "Interviews This Week",
            value: 12,
            status: 'info',
            description: "Scheduled interviews for the next 7 days",
            action: {
                label: "View Schedule",
                href: "/interviews"
            }
        },
        {
            title: "Offers Pending",
            value: 5,
            status: 'success',
            description: "Job offers awaiting candidate response",
            action: {
                label: "Track Offers",
                href: "/offers"
            }
        },
        {
            title: "Positions to Fill",
            value: 8,
            status: 'error',
            description: "Open positions with urgent hiring needs",
            action: {
                label: "View Jobs",
                href: "/jobs?status=urgent"
            }
        }
    ];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-600"/>;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-yellow-600"/>;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-600"/>;
            default:
                return <Clock className="h-4 w-4 text-blue-600"/>;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'border-green-200 bg-green-50';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50';
            case 'error':
                return 'border-red-200 bg-red-50';
            default:
                return 'border-blue-200 bg-blue-50';
        }
    };

    const getBadgeVariant = (status: string) => {
        switch (status) {
            case 'success':
                return 'default';
            case 'warning':
                return 'secondary';
            case 'error':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5"/>
                    Action Items
                </CardTitle>
                <CardDescription>
                    Important tasks that need your attention
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {summaryItems.map((item, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-lg border-2 ${getStatusColor(item.status)} transition-all duration-200 hover:shadow-md`}
                        >
                            <div className="">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(item.status)}
                                    <div>
                                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-600">{item.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={getBadgeVariant(item.status)} className="text-base font-bold px-2">
                                        {item.value}
                                    </Badge>
                                    {item.action && (
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={item.action.href} className="flex items-center gap-1">
                                                {item.action.label}
                                                <ArrowRight className="h-3 w-3"/>
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Weekly Goals Progress</h4>
            <span className="text-sm text-muted-foreground">3 of 5 completed</span>
          </div>
          <Progress value={60} className="mb-2" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Review 50 applications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Conduct 15 interviews</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Post 3 new jobs</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Make 5 offers</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Close 2 positions</span>
            </div>
          </div>
        </div> */}

                {/* <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">94%</div>
              <div className="text-xs text-muted-foreground">Response Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">18</div>
              <div className="text-xs text-muted-foreground">Days Avg. Hire</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <div className="text-xs text-muted-foreground">Offer Accept</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">4.8</div>
              <div className="text-xs text-muted-foreground">Candidate Rating</div>
            </div>
          </div>
        </div> */}
            </CardContent>
        </Card>
    );
};

export default DashboardSummary;
