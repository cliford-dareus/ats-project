"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import React from "react";
import {ChartInterface} from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";

const chartConfig = {
    views: {
        label: "Page Views",
    },
    count: {
        label: "Count",
        color: "hsl(var(--chart-1))",
    }
} satisfies ChartConfig

type Props = {
    data: ChartInterface[];
};

const LineChart = ({data}: Props) => {
    return (
        <div className="flex flex-col h-full border shadow rounded">
            <div className="m-4">

            </div>
            <Card className="h-full border-none shadow-none">
                <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                        <CardTitle>Bar Chart - Interactive</CardTitle>
                        <CardDescription>
                            Showing total visitors for the last 3 months
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:p-6">
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-[200px] w-full"
                    >
                        <BarChart
                            accessibilityLayer
                            data={data}
                            margin={{
                                left: 12,
                                right: 12,
                            }}
                        >
                            <CartesianGrid vertical={false}/>
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="w-[150px]"
                                        nameKey="views"
                                    />
                                }
                            />
                            <Bar dataKey='count' fill="red"/>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}

export default LineChart;
