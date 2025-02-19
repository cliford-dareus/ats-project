'use client'

import React, {useState} from 'react';
import CircleChart from "@/app/(dashboard)/dashboard/_components/charts/circle-chart";
import RadarChart from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import ComponentPicker from "@/app/(dashboard)/dashboard/_components/component-picker";
import LineChart from "@/app/(dashboard)/dashboard/_components/charts/line-chart";
import AreaChart from "@/app/(dashboard)/dashboard/_components/charts/area-chart";


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
        <div className="grid grid-cols-2 gap-4 p-4">
            {Object.keys(sections).map((section) => (
                <div key={section} className="border p-4">
                    {/*<h3>{section}</h3>*/}
                    <ComponentPicker
                        section={section}
                        selectedComponent={sections[section]}
                        onChange={handleComponentChange}
                        components={Object.keys(components)}
                    />
                    {React.createElement(components[sections[section]])}
                </div>
            ))}
        </div>
    );
};

export default DashboardLayout;