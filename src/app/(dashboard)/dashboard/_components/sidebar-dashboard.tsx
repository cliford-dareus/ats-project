"use client";

import React, {useState} from 'react';
import {
    Calendar,
    Users,
    BriefcaseBusiness,
    Clock,
    Target,
    Activity,
    RefreshCw
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import QuickActions from './quick-actions';


const SidebarDashboard = () => {
    const [selectedTimeframe, setSelectedTimeframe] = useState('week');

    const timeframes = [
        {id: 'today', label: 'Today', period: '24h'},
        {id: 'week', label: 'This Week', period: '7d'},
        {id: 'month', label: 'This Month', period: '30d'},
        {id: 'quarter', label: 'This Quarter', period: '90d'}
    ];

    const quickStats = [
        {
            id: 'active-jobs',
            label: 'Active Jobs',
            value: 24,
            change: '+3',
            icon: BriefcaseBusiness,
            color: 'text-blue-600'
        },
        {
            id: 'new-applications',
            label: 'New Applications',
            value: 156,
            change: '+12',
            icon: Users,
            color: 'text-green-600'
        },
        {
            id: 'interviews-scheduled',
            label: 'Interviews Today',
            value: 8,
            change: '+2',
            icon: Calendar,
            color: 'text-purple-600'
        },
        {
            id: 'offers-pending',
            label: 'Pending Offers',
            value: 5,
            change: '0',
            icon: Target,
            color: 'text-orange-600'
        }
    ];

    const recentActivity = [
        {
            type: 'application',
            message: 'New application for Senior Developer',
            time: '5 min ago',
            priority: 'high'
        },
        {
            type: 'interview',
            message: 'Interview completed with John Smith',
            time: '1 hour ago',
            priority: 'medium'
        },
        {
            type: 'offer',
            message: 'Offer accepted by Sarah Johnson',
            time: '2 hours ago',
            priority: 'high'
        },
        {
            type: 'job',
            message: 'New job posted: Frontend Engineer',
            time: '3 hours ago',
            priority: 'low'
        }
    ];

    const upcomingTasks = [
        {
            task: 'Review applications for React Developer',
            due: 'In 2 hours',
            priority: 'high'
        },
        {
            task: 'Conduct interview with Alex Brown',
            due: 'Tomorrow 10:00 AM',
            priority: 'high'
        },
        {
            task: 'Send offer letter to candidate',
            due: 'Tomorrow 2:00 PM',
            priority: 'medium'
        },
        {
            task: 'Update job description for Backend role',
            due: 'This Friday',
            priority: 'low'
        }
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
        <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto">
            {/* Time Frame Selector */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={20}/>
                        <span className="font-medium text-base">Overview</span>
                    </div>
                    <Button variant="ghost" size="sm">
                        <RefreshCw size={16}/>
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {timeframes.map((timeframe) => (
                        <Button
                            key={timeframe.id}
                            variant={selectedTimeframe === timeframe.id ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => setSelectedTimeframe(timeframe.id)}
                        >
                            {timeframe.label}
                        </Button>
                    ))}
                </div>
            </div>

            <Separator/>

            {/*  Quick Actions */}
            <QuickActions/>

            {/* <Separator /> */}

            {/* Quick Stats */}
            {/* <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={20} />
                    <span className="font-medium text-base">Quick Stats</span>
                </div>
                <div className="space-y-3">
                    {quickStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.id} className="p-3 rounded border hover:bg-muted transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon size={16} className={stat.color} />
                                        <span className="text-sm font-medium">{stat.value}</span>
                                    </div>
                                    <Badge variant={stat.change.startsWith('+') ? "default" : "secondary"} className="text-xs">
                                        {stat.change}
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div> */}

            {/* <Separator /> */}

            {/* Rce-y-3">
                <div className="flex items-center gap-2">
                    <Bell size={20} /ecent Activity */}
            {/* <div className="spa>
                    <span className="font-medium text-base">Recent Activity</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recentActivity.map((activity, index) => (
                        <div key={index} className="p-2 rounded hover:bg-muted transition-colors">
                            <div className="flex items-start gap-2">
                                <span className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(activity.priority)}`}></span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm">{activity.message}</div>
                                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div> */}

            {/* <Separator /> */}

            {/* Upcoming Tasks */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-medium text-base">Upcoming Tasks</span>
                </div>
                <div className="space-y-2">
                    {upcomingTasks.map((task, index) => (
                        <div key={index} className="p-2 rounded border hover:bg-muted transition-colors">
                            <div className="flex items-start gap-2">
                                <span className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(task.priority)}`}></span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{task.task}</div>
                                    <div className="text-xs text-muted-foreground">{task.due}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            {/*<div className="mt-auto space-y-2">*/}
            {/*    <Button variant="outline" size="sm" className="w-full justify-start">*/}
            {/*        <Filter size={16} className="mr-2"/>*/}
            {/*        Customize Dashboard*/}
            {/*    </Button>*/}
            {/*    <Button variant="outline" size="sm" className="w-full justify-start">*/}
            {/*        <Calendar size={16} className="mr-2"/>*/}
            {/*        View Full Calendar*/}
            {/*    </Button>*/}
            {/*</div>*/}
        </div>
    );
};

export default SidebarDashboard;
