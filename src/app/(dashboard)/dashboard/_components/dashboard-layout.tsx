'use client'

import React, {useState} from 'react';
import CircleChart from "@/app/(dashboard)/dashboard/_components/charts/circle-chart";
import RadarChart from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import ComponentPicker from "@/app/(dashboard)/dashboard/_components/component-picker";
import LineChart from "@/app/(dashboard)/dashboard/_components/charts/line-chart";
import AreaChart from "@/app/(dashboard)/dashboard/_components/charts/area-chart";
import {cn} from "@/lib/utils";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import Link from "next/link";
import {ArrowRight, ArrowUp} from "lucide-react";


type Props = {
    organization: string;
    job_open: any;
    hired_candidates: any;
    job_listings: any;
};

const DashboardLayout = ({organization, job_open, job_listings, hired_candidates}: Props) => {
    const [sections, setSections] = useState({section1: "circleChart"} as {
        [key: string]: string
    });

    const components = {
        circleChart: () => <CircleChart id={organization}/>,
        radarChart: () => <RadarChart/>,
        lineChart: () => <LineChart id={organization}/>,
        areaChart: () => <AreaChart/>
    } as { [key: string]: () => React.JSX.Element };

    const handleComponentChange = (section: string, component: string) => {
        setSections((prev) => ({...prev, [section]: component}));
    };

    return (
        <div className="p-4 lg:max-w-8xl 2xl:mx-auto ">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="h-[150px] mt-2 rounded grid grid-cols-6 gap-8">
                <div className="col-span-4 flex flex-col justify-between gap-4 h-full flex-1">
                    <div className="mt-2">
                        <h2 className="text-xl font-semibold text-gray-900">Welcome, Cliford</h2>
                        <p className="text-sm text-gray-500">View and manage your organization's dashboard</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 md:grid-cols-3">
                        <div className="col-span-2 rounded p-4 bg-blue-200">
                            <Link href="" className="flex items-center gap-4">
                                <span className="text-2xl">120</span>
                                <p className="text-sm text-gray-500">Applications need to be review</p>
                                <p className="text-blue-500 hover:text-blue-600">
                                    <ArrowRight size={18}/>
                                </p>
                            </Link>
                        </div>
                        <div className="border p-4 rounded"></div>
                    </div>
                </div>

                <Card className="col-span-2 bg-white border border-transparent rounded">
                    <CardHeader>
                        <CardTitle>Activities</CardTitle>
                        <CardDescription>
                            Showing total visitors for the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                {Object.keys(sections).map((section) => (
                    <div key={section}
                         className={cn("h-[400px] md:col-span-2 row-span-1 rounded-xl group/bento transition duration-200 shadow-input dark:shadow-none dark:bg-black dark:border-white/[0.2] bg-white border-none border-transparent")}>
                        <div className="relative h-full">
                            <div className="w-[130px] absolute right-4 top-4">
                                <ComponentPicker
                                    section={section}
                                    selectedComponent={sections[section]}
                                    onChange={handleComponentChange}
                                    components={Object.keys(components)}
                                />
                            </div>
                            {React.createElement(components[sections[section]])}
                        </div>
                    </div>
                ))}

                <Card className="md:col-span-1 row-span-2 bg-white border border-transparent rounded">
                    <CardHeader>
                        <CardTitle>Activities</CardTitle>
                        <CardDescription>
                            Showing total visitors for the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    </CardContent>
                </Card>

                <div className="col-span-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold leading-none tracking-tight">Analytics</h3>
                        <Link className="text-sm text-blue-500" href=''>See more</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div className="p-4 shadow rounded flex flex-col bg-card text-card-foreground">
                            <div className="flex gap-2 items-center text-blue-500">
                                <p className="font-bold text-2xl">{118}</p>
                                <div
                                    className="flex items-center justify-center gap-2 bg-blue-200 rounded-full h-[20px] w-[20px]">
                                    <ArrowUp size={16}/>
                                </div>
                            </div>
                            <h3 className="text-muted-foreground">Last applicants</h3>
                            <span className="text-xs text-muted-foreground">Last 30 days</span>
                        </div>
                        <div className="p-4 shadow rounded flex flex-col bg-card text-card-foreground">
                            <div className="flex gap-2 items-center text-blue-500">
                                <p className="font-bold text-2xl">{2000}</p>
                                <div
                                    className="flex items-center justify-center gap-2 bg-blue-200 rounded-full h-[20px] w-[20px]">
                                    <ArrowUp size={16}/>
                                </div>
                            </div>
                            <h3 className="text-muted-foreground">Jobs Openings</h3>
                            <span className="text-xs text-muted-foreground">Last 30 days</span>
                        </div>
                        <div className="p-4 shadow rounded flex flex-col bg-card text-card-foreground">
                            <div className="flex gap-2 items-center text-blue-500">
                                <p className="font-bold text-2xl">{500}</p>
                                <div
                                    className="flex items-center justify-center gap-2 bg-blue-200 rounded-full h-[20px] w-[20px]">
                                    <ArrowUp size={16}/>
                                </div>
                            </div>
                            <h3 className="text-muted-foreground">Hires</h3>
                            <span className="text-xs text-muted-foreground">Last 30 days</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;