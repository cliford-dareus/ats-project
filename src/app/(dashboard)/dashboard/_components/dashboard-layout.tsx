'use client'

import React from 'react';
import {ChartInterface} from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import Link from "next/link";
import {ArrowRight, ArrowUp} from "lucide-react";
import ChartCard from "@/app/(dashboard)/dashboard/_components/chart-card";

type Props = {
    organization: string;
    job_open: ChartInterface[] | null;
    hired_candidates: ChartInterface[] | null;
    job_listings: ChartInterface[] | null;
    applications: ChartInterface[] | null;
};

const DashboardLayout = ({organization, job_open, job_listings, hired_candidates}: Props) => {
    return (
        <div className="p-4 lg:max-w-8xl 2xl:mx-auto ">
            <div className="h-[150px] mt-2 rounded grid grid-cols-6 gap-8">
                <div className="col-span-4 flex flex-col justify-between gap-4 h-full flex-1">
                    <div className="mt-2">
                        <h2 className="text-xl font-semibold text-gray-900">Welcome, Cliford</h2>
                        <p className="text-sm text-gray-500">{"View and manage your organization\'s dashboard"}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 rounded p-4 bg-blue-200">
                            <Link href="" className="flex items-center gap-4">
                                <span className="text-2xl">120</span>
                                <p className="text-sm text-gray-500">Applications need to be review</p>
                                <p className="text-blue-500 hover:text-blue-600">
                                    <ArrowRight size={18}/>
                                </p>
                            </Link>
                        </div>
                        <div className="border p-4 rounded col-span-1"></div>
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
                <ChartCard
                    queryKey="range"
                    organization={organization}
                    job_open={job_open as ChartInterface[]}
                    hired_candidates={hired_candidates as ChartInterface[]}
                    job_listings={job_listings as ChartInterface[]}
                />

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