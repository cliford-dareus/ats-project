'use client'

import React from 'react';
import {Label, Pie, PieChart} from "recharts"
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {TrendingUp} from "lucide-react";
import {ChartInterface} from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";

export const chartData = [
    {fill: "var(--color-date)"},
    {fill: "var(--color-date2)"},
    {fill: "var(--color-date3)"},
    {fill: "var(--color-date4)"},
    {fill: "var(--color-other)"},
];

const chartConfig = {
    candidates: {
        label: "Candidates",
    },
    date: {
        label: "date",
        color: "hsl(var(--chart-1))",
    },
    date2: {
        label: "date",
        color: "hsl(var(--chart-2))",
    },
    date3: {
        label: "date",
        color: "hsl(var(--chart-3))",
    },
    date4: {
        label: "date",
        color: "hsl(var(--chart-4))",
    },
    data5: {
        label: "date",
        color: "hsl(var(--chart-5))",
    },
    older: {
        label: "Older",
        color: "hsl(var(--chart-5))",
    },
} satisfies ChartConfig;

const CircleChart = ({data}: { data: ChartInterface[] }) => {
        let i = 0;

        const formattedData = data.map(item => {
            const h = {} as { fill: string, date: string, count: number };
            if (item.count !== 0) {
                h.fill = chartData[i].fill
                h.date = item.date
                h.count = item.count
                i++
            }
            return {...h, item};
        })

        const totalVisitors = React.useMemo(() => {
            return data.reduce((acc, curr) => acc + curr.count, 0)
        }, []);

        return (
            <Card className="flex flex-col h-full rounded">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Pie Chart - Donut with Text</CardTitle>
                    <CardDescription>January - June 2024</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[250px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel/>}
                            />
                            <Pie
                                data={formattedData}
                                dataKey="count"
                                nameKey="date"
                                innerRadius={60}
                                strokeWidth={5}
                            >
                                <Label
                                    content={({viewBox}) => {
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
                                                        {totalVisitors.toLocaleString()}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground"
                                                    >
                                                        Total visitors
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 font-medium leading-none">
                        Trending up by 5.2% this month <TrendingUp className="h-4 w-4"/>
                    </div>
                    <div className="leading-none text-muted-foreground">
                        Showing total visitors for the last 6 months
                    </div>
                </CardFooter>
            </Card>
        );
    }
;

export default CircleChart;