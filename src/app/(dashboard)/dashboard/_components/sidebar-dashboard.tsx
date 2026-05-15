"use client";

import React, { useState } from 'react';
import {
    Calendar,
    Users,
    BriefcaseBusiness,
    Clock,
    Target,
    Activity,
    RefreshCw,
    Search,
    Briefcase,
    TrendingUp,
    Plus,
    ArrowUpRight,
    Sparkles,
    Zap,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';


const SidebarDashboard = () => {
    const [selectedTimeframe, setSelectedTimeframe] = useState('week');

    const timeframes = [
        { id: 'today', label: 'Today', period: '24h' },
        { id: 'week', label: 'This Week', period: '7d' },
        { id: 'month', label: 'This Month', period: '30d' },
        { id: 'quarter', label: 'This Quarter', period: '90d' }
    ];

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'low':
                return 'bg-green-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <div className="flex flex-col overflow-y-auto h-[calc(100vh-125px)]">
            <div className="px-4">
                <div className="relative group overflow-hidden bg-card rounded-md border border-zinc-200 p-4 flex flex-col justify-between min-h-[280px] shadow-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -ml-24 -mb-24 group-hover:bg-amber-500/10 transition-all duration-700" />

                    <div className="relative space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-foreground zinc-900 tracking-tight">Ask Apliko AI</h2>
                                <p className="text-xs text-zinc-500 font-medium italic">Your intelligent recruitment partner</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-foreground max-w-md leading-tight pt-4">
                            Ready To Find Top Candidates Or Revisit Your Pipeline?
                        </h3>
                    </div>

                    <div className="relative pt-8 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {['Find Matches', 'My Pipeline', 'Insights'].map((label) => (
                                <button key={label} className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-md text-[10px] font-bold text-zinc-600 transition-all flex items-center gap-2">
                                    {label === 'Find Matches' && <Search className="w-3.5 h-3.5" />}
                                    {label === 'My Pipeline' && <Briefcase className="w-3.5 h-3.5" />}
                                    {label === 'Insights' && <TrendingUp className="w-3.5 h-3.5" />}
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex items-center">
                            <Plus className="absolute left-4 w-4 h-4 text-zinc-400" />
                            <Input
                                type="text"
                                placeholder="Ask me anything about your recruitment data..."
                                // value={query}
                                // onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-md py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                            <Button className="absolute right-0 p-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all">
                                <ArrowUpRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/*<Separator />*/}

            <div className="space-y-6">
                <div className='px-4'>
                    <div
                        className="bg-card rounded-md border border-zinc-200 p-4 relative overflow-hidden group shadow-sm h-full flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />

                        <div className="relative flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-foreground tracking-wide uppercase">Complete your company profile</h3>
                        </div>

                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed my-2">
                            Personalize your company's profile, invite team members and setup your company's career page.
                        </p>


                        <Button
                            className="!p-0 border rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2"
                        >
                            Launch Assistant
                            <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 mt-auto p-4 bg-foreground rounded-md overflow-hidden relative group">
                {/* Decorative background element */}
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />

                <div className="relative z-10 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white tracking-tight">Need custom triggers?</h3>
                        <p className="text-zinc-400 text-sm max-w-md">
                            Connect with over 2,000+ apps via our Zapier integration to build even more powerful workflows.
                        </p>
                    </div>
                    <Button
                        className="border text-[10px] uppercase tracking-widest flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-md font-bold text-sm hover:scale-105 transition-all active:scale-95"
                    >
                        Connect Zapier
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SidebarDashboard;
