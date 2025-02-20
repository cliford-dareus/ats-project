'use client'

import React, {useState} from 'react';
import CircleChart from "@/app/(dashboard)/dashboard/_components/charts/circle-chart";
import RadarChart from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import ComponentPicker from "@/app/(dashboard)/dashboard/_components/component-picker";
import LineChart from "@/app/(dashboard)/dashboard/_components/charts/line-chart";
import AreaChart from "@/app/(dashboard)/dashboard/_components/charts/area-chart";
import {cn} from "@/lib/utils";

const DashboardLayout = ({organization}: { organization: string }) => {
    const [sections, setSections] = useState({section1: "circleChart", section2: "lineChart"} as {
        [key: string]: string
    });

    const components = {
        circleChart: () => <CircleChart id={organization}/>,
        radarChart: () => <RadarChart/>,
        lineChart: () => <LineChart/>,
        areaChart: () => <AreaChart/>
    } as { [key: string]: () => React.JSX.Element };

    const handleComponentChange = (section: string, component: string) => {
        setSections((prev) => ({...prev, [section]: component}));
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="h-[100px] p-4 border shadow rounded">
                    <h3>Last applicants</h3>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Jobs Openings</h3>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Hires</h3>
                </div>
                <div className="p-4 border shadow rounded">
                    <h3>Last applicants</h3>
                </div>
            </div>

            <div className="grid md:auto-rows-[32rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
                {Object.keys(sections).map((section, i) => (
                    <div key={section} className={cn(i == 1? "md:col-span-2":"", "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4")}>
                       <div>
                           <ComponentPicker
                               section={section}
                               selectedComponent={sections[section]}
                               onChange={handleComponentChange}
                               components={Object.keys(components)}
                           />
                           {React.createElement(components[sections[section]])}
                       </div>
                    </div>
                ))}

            </div>
        </div>
    );
};

export default DashboardLayout;