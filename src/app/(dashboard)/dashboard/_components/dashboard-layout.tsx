'use client'

import React, {useState} from 'react';
import CircleChart from "@/app/(dashboard)/dashboard/_components/charts/circle-chart";
import RadarChart from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import ComponentPicker from "@/app/(dashboard)/dashboard/_components/component-picker";
import LineChart from "@/app/(dashboard)/dashboard/_components/charts/line-chart";
import AreaChart from "@/app/(dashboard)/dashboard/_components/charts/area-chart";
import {cn} from "@/lib/utils";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

type Props = {
    organization: string;
    job_open: any;
    hired_candidates: any;
    job_listings: any
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
        <div className="p-4">
            {/*<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>*/}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">
                <div className="h-[130px] p-4 border shadow rounded bg-blue-200">
                    <h3>Last applicants</h3>
                    <p>{}</p>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Jobs Openings</h3>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Hires</h3>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Last applicants</h3>
                    <p>{}</p>
                </div>
            </div>

            <div className="grid md:auto-rows-[26rem] grid-cols-1 md:grid-cols-3 gap-8 mt-4">
                {Object.keys(sections).map((section) => (
                    <div key={section}
                         className={cn("md:col-span-2 row-span-1 rounded-xl group/bento transition duration-200 shadow-input dark:shadow-none dark:bg-black dark:border-white/[0.2] bg-white border border-transparent")}>
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

                <Card className="md:col-span-1 bg-white border border-transparent">
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
        </div>
    );
};

export default DashboardLayout;