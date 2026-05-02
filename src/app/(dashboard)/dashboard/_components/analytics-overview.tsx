"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Area,
    AreaChart
} from 'recharts';
import {
    Download,
    Filter,
    TrendingUp,
    Users,
    Briefcase,
    Target
} from "lucide-react";

interface AnalyticsData {
    applications: { date: string; count: number; }[];
    hires: { date: string; count: number; }[];
    sources: { name: string; value: number; color: string}[];
    stages: { stage: "Applied" | "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | "Drafted" | 'Hired' | null; stageOrder: number;  count: number; conversion: number; }[];
};

interface Props {
    data: AnalyticsData;
    className?: string;
};

const AnalyticsOverview = ({ data, className }: Props) => {
    const [activeTab, setActiveTab] = useState('applications');

    const CustomTooltip = ({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ dataKey: string; value: number; color: string }>;
        label?: string;
    }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-medium">{`${label}`}</p>
                    {payload.map((entry, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {`${entry.dataKey}: ${entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5" />
                        Analytics Overview
                    </CardTitle>
                    <CardDescription>
                        Detailed insights into your recruitment performance
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="applications">Applications</TabsTrigger>
                        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                        <TabsTrigger value="sources">Sources</TabsTrigger>
                        <TabsTrigger value="trends">Trends</TabsTrigger>
                    </TabsList>

                    <TabsContent value="applications" className="space-y-4">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.applications}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#8884d8"
                                        fill="#8884d8"
                                        fillOpacity={0.6}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {data.applications.reduce((sum, item) => sum + item.count, 0)}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Applications</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {Math.round(data.applications.reduce((sum, item) => sum + item.count, 0) / data.applications.length)}
                                </div>
                                <div className="text-sm text-muted-foreground">Daily Average</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    +12%
                                </div>
                                <div className="text-sm text-muted-foreground">Growth Rate</div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pipeline" className="space-y-4">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.stages}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="stage" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            {data.stages.map((stage, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="font-medium">{stage.stage}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            {stage.count} candidates
                                        </span>
                                        <Badge variant="outline">
                                            {stage.conversion}% conversion
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="sources" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.sources}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {data.sources.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-medium">Source Performance</h4>
                                {data.sources.map((source, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: source.color }}
                                            />
                                            <span className="font-medium">{source.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">{source.value}</div>
                                            <div className="text-xs text-muted-foreground">applications</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="trends" className="space-y-4">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.applications}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        dot={{ fill: '#8884d8' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                                    <div className="text-2xl font-bold text-green-600">+24%</div>
                                    <div className="text-sm text-muted-foreground">Applications</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                                    <div className="text-2xl font-bold text-blue-600">+18%</div>
                                    <div className="text-sm text-muted-foreground">Candidates</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Briefcase className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                                    <div className="text-2xl font-bold text-purple-600">+12%</div>
                                    <div className="text-sm text-muted-foreground">Job Posts</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Target className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                                    <div className="text-2xl font-bold text-orange-600">+31%</div>
                                    <div className="text-sm text-muted-foreground">Hires</div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default AnalyticsOverview;
