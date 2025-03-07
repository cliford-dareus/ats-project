'use client'

import React from 'react';
import {ChartInterface} from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import Link from "next/link";
import ChartCard from "@/app/(dashboard)/dashboard/_components/chart-card";
import StatCard from '@/components/stat-card';

type Props = {
    job_open: ChartInterface[] | null;
    hired_candidates: ChartInterface[] | null;
    job_listings: ChartInterface[] | null;
    applications: ChartInterface[] | null;
};

const DashboardLayout = ({job_open, job_listings, hired_candidates}: Props) => {
    return (
        <div className="">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <ChartCard
                    queryKey="range"
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

                <div className="md:col-span-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold leading-none tracking-tight">Analytics</h3>
                        <Link className="text-sm text-blue-500" href=''>See more</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <StatCard title="Last applicants" end={2000} description="Last 30 days" duration={2} />
                        <StatCard title="Jobs Openings" end={2000} description='Last 30 days'duration={2}/>
                        <StatCard title="Hires" end={500} description='Last 30 days'duration={2}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;