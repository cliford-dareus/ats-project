"use client";

import React from 'react';
import { Card, CardContent, CardHeader} from "@/components/ui/card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import {TrendingUp} from "lucide-react";

interface AnalyticsData {
    applications: { date: string; count: number; }[];
    hires: { date: string; count: number; }[];
    sources: { name: string; value: number; color: string }[];
    stages: { stage: "Applied" | "New Candidate" | "Screening" | "Phone Interview" | "Interview" | "Offer" | "Drafted" | 'Hired' | null; stageOrder: number; count: number; conversion: number; }[];
};

interface Props {
    data: AnalyticsData;
    className?: string;
};

const AnalyticsOverview = ({ data, className }: Props) => {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center justify-between mb-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-black rounded-md text-white shadow-xl">
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 tracking-tight uppercase">Application Trends</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Weekly Performance Metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Applications</span>
                        </div>
                        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer uppercase tracking-widest">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.applications}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
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
                                stroke="#4F46E5"
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
