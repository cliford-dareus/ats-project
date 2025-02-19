"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import React, {useCallback, useEffect, useState} from "react";

const chartConfig = {
    views: {
        label: "Page Views",
    },
    count: {
        label: "Count",
        color: "hsl(var(--chart-1))",
    }
} satisfies ChartConfig

const LineChart = () => {
    const [applicationData, setApplicationData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [timeRange, setTimeRange] = useState("week"); // Default to past week

    const exampleData = [
        {date: "2025-02-01", count: 10},
        {date: "2025-02-05", count: 15},
        {date: "2025-02-10", count: 20},
        {date: "2025-02-15", count: 25},
        {date: "2025-02-16", count: 30},
        {date: "2025-02-17", count: 35},
        {date: "2025-02-18", count: 40},
    ];

    useEffect(() => {
        // Simulate fetching data (replace with an API call)
        setApplicationData(exampleData);
        filterData(applicationData, timeRange);
    }, []);

    useEffect(() => {
        filterData(applicationData, timeRange);
    }, [timeRange, applicationData]);

    const filterData = useCallback((data, range: string) => {
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

        setFilteredData(filtered);
    }, []);

    if (filteredData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <p>No data available for the selected time range.</p>
            </div>
        );
    }

    return (
        <div className="flex  flex-col ">
            <div className="mb-4">
                {/* Time Range Buttons */}
                <button
                    className={`px-4 py-2 mr-2 ${
                        timeRange === "week" ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                    onClick={() => setTimeRange("week")}
                >
                    Past Week
                </button>
                <button
                    className={`px-4 py-2 ${
                        timeRange === "month" ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                    onClick={() => setTimeRange("month")}
                >
                    Past Month
                </button>
            </div>

            {/* Chart */}
            <Card>
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
                        className="aspect-auto h-[250px] w-full"
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
