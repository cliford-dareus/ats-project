"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrendRange } from "@/server/actions/dashboard-actions";

interface AnalyticsData {
    applications: { date: string; count: number; }[];
};

interface Props {
    data: AnalyticsData;
    range: TrendRange;
    onRangeChange: (range: string) => void;
    className?: string;
};

const AnalyticsOverview = ({ data, range, onRangeChange, className }: Props) => {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center justify-between mb-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary text-primary-foreground shadow-xl">
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <h3 className="font-black tracking-tight uppercase">Application Trends</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{range === '30d' ? 'Last 30 Days' : 'Last 7 Days'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl border border-border">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Applications</span>
                        </div>
                        <Select value={range} onValueChange={onRangeChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border rounded-xl px-4 py-2 text-[11px] font-bold text-muted-foreground focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer uppercase tracking-widest">
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.applications}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00b9cb" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#00b9cb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#25273c', opacity: 0.4 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#25273c', opacity: 0.4 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '24px',
                                    border: '1px solid #F1F5F9',
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    padding: '16px'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: '800', color: '#1E293B' }}
                                labelStyle={{ fontSize: '10px', fontWeight: '800', color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#00b9cb"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default AnalyticsOverview;
