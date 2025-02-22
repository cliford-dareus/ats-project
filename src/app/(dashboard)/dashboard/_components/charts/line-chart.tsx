"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import React, {useCallback, useEffect, useState} from "react";
import {get_all_applications_action} from "@/server/actions/application_actions";
import {groupByDay} from "@/lib/utils";

const chartConfig = {
    views: {
        label: "Page Views",
    },
    count: {
        label: "Count",
        color: "hsl(var(--chart-1))",
    }
} satisfies ChartConfig

const LineChart = ({id}: { id: string }) => {
    const [applicationData, setApplicationData] = useState<{ date: string, count: number, fill: string }[]>([]);
    const [filteredData, setFilteredData] = useState<{ date: string, count: number, fill: string }[]>([]);
    const [timeRange, setTimeRange] = useState("month"); // Default to past week

    useEffect(() => {
            const fetchData = async () => {
                const result = await get_all_applications_action({organization: id});
                const formattedData = groupByDay(result as Partial<[]>);
                setApplicationData(Object.values(formattedData));
                filterData(Object.values(formattedData), timeRange);
            };

            fetchData();
        }, []
    )

    useEffect(() => {
        filterData(applicationData, timeRange);
    }, [timeRange, applicationData]);

    const filterData = useCallback((data: { date: string, count: number, fill: string }[], range: string) => {
        const now = new Date();
        let filtered;

        if (range === "week") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            filtered = data.filter((item) => new Date(item.date) >= oneWeekAgo);
        } else if (range === "month") {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            filtered = data.filter((item) => new Date(item.date) >= oneMonthAgo);
        }

        if (filtered === undefined) {
            return
        }
        setFilteredData(filtered);
    }, []);

    return (
        <div className="flex flex-col h-full border shadow rounded">
            <div className="m-4">
                <button
                    className={`px-4 py-1 mr-2 text-sm ${
                        timeRange === "week" ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                    onClick={() => setTimeRange("week")}
                >
                    Past Week
                </button>
                <button
                    className={`px-4 py-1 text-sm ${
                        timeRange === "month" ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                    onClick={() => setTimeRange("month")}
                >
                    Past Month
                </button>
            </div>

            {/* Chart */}
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
                            data={filteredData}
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
                                tickFormatter={(value) => {
                                    const date = new Date(value)
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })
                                }}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="w-[150px]"
                                        nameKey="views"
                                        labelFormatter={(value) => {
                                            return new Date(value).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })
                                        }}
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
