import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RecrutmentFunnel } from "./dashboard";
import { useMemo, useState } from "react";
import {
    ChartContainer,
    ChartStyle,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { Label, Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import { color } from "motion/react";

interface Props {
    data: RecrutmentFunnel[];
    totalApplications: number;
    className?: string;
};

const ApplicationBreakdown = ({ data, className }: Props) => {
    const [activeStage, setActiveStage] = useState(data[0].stage);

    const activeIndex = useMemo(
        () => data.findIndex((item) => item.stage === activeStage),
        [activeStage]
    );

    const stages = useMemo(() => data.map((item) => item.stage), []);
    const coloredData = useMemo(() => data.map((item) => ({ ...item, fill: item.stageColor })), []);

    const chartConfig: ChartConfig = useMemo(() => data.reduce((acc, item) => {
        acc[item.stage!] = {
            label: item.stage,
            color: item.stageColor!
        };
        return acc

    }, {} as ChartConfig), []);

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <h3 className="font-black text-slate-900 tracking-tight uppercase">Application Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            onChange={(e) => setActiveStage(e.target.value)}
                            value={activeStage as string}
                            className="text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer uppercase"
                        >
                            {stages.map((stage) => (
                                <option key={stage} value={stage as string}>{stage}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ChartContainer
                        id="application-breakdown"
                        config={chartConfig}
                        className="mx-auto aspect-square w-full max-w-[300px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={coloredData}
                                dataKey="count"
                                nameKey="stage"
                                innerRadius={60}
                                strokeWidth={5}
                                activeIndex={activeIndex}
                                activeShape={({
                                    outerRadius = 0,
                                    ...props
                                }: PieSectorDataItem) => (
                                    <g>
                                        <Sector {...props} outerRadius={outerRadius + 10} />
                                        <Sector
                                            {...props}
                                            outerRadius={outerRadius + 25}
                                            innerRadius={outerRadius + 12}
                                        />
                                    </g>
                                )}
                            >
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-3xl font-bold"
                                                    >
                                                        {data[activeIndex].count.toLocaleString()}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground"
                                                    >
                                                        Applicants
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </div>

                {/* List of stages with applications count */}
                <div className="flex flex-col mt-4">
                    {data.map((item) => (
                        <div key={item.stage} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stageColor }} />
                            <span className="text-[11px] font-bold text-slate-600">{item.stage}</span>
                            <span className="text-[11px] font-bold text-slate-600">{item.count.toLocaleString()}</span>
                            <span className="text-[11px] font-bold text-slate-600">{item.conversion}%</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
};

export default ApplicationBreakdown;
