"use client";

import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {Badge} from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    Clock,
    Target,
    Users,
    CheckCircle,
    AlertTriangle,
    Calendar
} from "lucide-react";
import {cn} from "@/lib/utils";

interface PerformanceMetric {
    title: string;
    value: number;
    target: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    description: string;
}

interface Props {
    className?: string;
}

const PerformanceMetrics = ({className}: Props) => {
    const metrics: PerformanceMetric[] = [
        {
            title: "Time to Hire",
            value: 18,
            target: 21,
            unit: "days",
            trend: 'up',
            trendValue: 12,
            icon: Clock,
            color: "text-green-600",
            description: "Average time from application to hire"
        },
        {
            title: "Application Conversion",
            value: 24,
            target: 20,
            unit: "%",
            trend: 'up',
            trendValue: 8,
            icon: Target,
            color: "text-blue-600",
            description: "Applications that result in interviews"
        },
        {
            title: "Interview to Hire",
            value: 32,
            target: 35,
            unit: "%",
            trend: 'down',
            trendValue: 5,
            icon: Users,
            color: "text-purple-600",
            description: "Interviews that result in hires"
        },
        {
            title: "Offer Acceptance",
            value: 87,
            target: 85,
            unit: "%",
            trend: 'up',
            trendValue: 3,
            icon: CheckCircle,
            color: "text-green-600",
            description: "Percentage of offers accepted"
        },
        {
            title: "Source Quality",
            value: 68,
            target: 70,
            unit: "%",
            trend: 'down',
            trendValue: 2,
            icon: AlertTriangle,
            color: "text-orange-600",
            description: "Quality candidates from top sources"
        },
        {
            title: "Interview Scheduling",
            value: 2.3,
            target: 3,
            unit: "days",
            trend: 'up',
            trendValue: 15,
            icon: Calendar,
            color: "text-indigo-600",
            description: "Average time to schedule interviews"
        }
    ];


    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="h-3 w-3 text-green-600"/>;
            case 'down':
                return <TrendingDown className="h-3 w-3 text-red-600"/>;
            default:
                return <div className="h-3 w-3 rounded-full bg-gray-400"/>;
        }
    };

    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return "text-green-600";
            case 'down':
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5"/>
                    Performance Metrics
                </CardTitle>
                <CardDescription>
                    Key recruitment performance indicators and targets
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {metrics.map((metric, index) => {
                        const isLowerBetter = metric.title.includes("Time") || metric.title.includes("days");
                        const progressValue = isLowerBetter
                            ? Math.max(0, 100 - (metric.value / metric.target) * 100)
                            : (metric.value / metric.target) * 100;

                        return (
                            <div key={index} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <metric.icon className={cn("h-4 w-4", metric.color)}/>
                                        <span className="font-medium text-sm">{metric.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {getTrendIcon(metric.trend)}
                                        <span className={cn("text-xs font-medium", getTrendColor(metric.trend))}>
                      {metric.trendValue}%
                    </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {metric.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </span>
                                        <span className="text-xs text-muted-foreground">
                      Target: {metric.target}{metric.unit}
                    </span>
                                    </div>

                                    <Progress
                                        value={Math.min(progressValue, 100)}
                                        className="h-2"
                                    />

                                    <p className="text-xs text-muted-foreground">
                                        {metric.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Performance Score</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-600">
                                Good
                            </Badge>
                            <span className="font-medium">78/100</span>
                        </div>
                    </div>
                    <Progress value={78} className="mt-2 h-2"/>
                </div>
            </CardContent>
        </Card>
    );
};

export default PerformanceMetrics;
