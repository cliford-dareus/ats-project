'use client'

import React, {useEffect, useMemo, useState} from 'react';
import {Label, Pie, PieChart} from "recharts"
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {TrendingUp} from "lucide-react";
import {get_all_candidates_action} from "@/server/actions/candidates-actions";
import {get_all_applications_action} from "@/server/actions/application_actions";
import {CandidatesResponseType} from "@/types/job-listings-types";

const chartData = [
    {fill: "var(--color-date)"},
    {fill: "var(--color-date2)"},
    {fill: "var(--color-date3)"},
    {fill: "var(--color-date4)"},
    {fill: "var(--color-other)"},
]

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
    older: {
        label: "Older",
        color: "hsl(var(--chart-5))",
    },
} satisfies ChartConfig

const CircleChart = ({id}: { id: string }) => {
        const [selectedData, setSelectedData] = useState<string>("candidates");
        const [activeData, setActiveData] = useState<{ date: string, count: number, fill: string }[]>([]);

        // TODO: Do the grouping by months instead
        //

        const groupedByDate = useMemo(() => {
            return (data: any[]) => {
                let index = 0;
                return data.reduce((acc, curr) => {
                    const now = new Date();
                    const fourMonthsAgo = new Date();
                    fourMonthsAgo.setMonth(now.getMonth() - 1);
                    const date = new Date(curr.created_at).toISOString().split("T")[0]; // Extract the date (YYYY-MM-DD)
                    const createdAt = new Date(curr.created_at);

                    if (createdAt >= fourMonthsAgo) {
                        if (!acc[date]) {
                            acc[date] = {
                                date,
                                count: 1,
                                fill: chartData[index].fill,
                            };
                            index++;
                        } else {
                            acc[date].count++;
                        }
                    } else {
                        if (!acc["Older"]) {
                            acc["Older"] = {
                                date: "older",
                                count: 1,
                                fill: chartData[4].fill,
                            };
                        } else {
                            acc["Older"].count++;
                        }
                    }
                    return acc;
                }, {} as Record<string, { date: string; count: number; fill: string }>);
            };
        }, []);

        useEffect(() => {
                const fetchData = async () => {
                    let data = []
                    if (selectedData === "candidates") {
                        const result = await get_all_candidates_action({limit: 1000, offset: 0});
                        data = (Array.isArray(result) ? result[1] : []) as CandidatesResponseType[]
                    } else if (selectedData === "applications") {
                        const application = await get_all_applications_action({organization: id});
                        if (Array.isArray(application)) {
                            data = application;
                        } else {
                            console.error(application.message);
                            data = [];
                        }
                    }
                    const formattedData = groupedByDate(data)
                    setActiveData(Object.values(formattedData));
                }
                fetchData();
            }, [selectedData]
        );

        const totalVisitors = React.useMemo(() => {
            return activeData.reduce((acc, curr) => acc + curr.count, 0)
        }, [activeData]);

        const handleChange = (event) => {
            setSelectedData(event.target.value); // Update selected dataset
        };

        if (!activeData.length) return null;

        return (
            <Card className="flex flex-col">
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
                                data={activeData}
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
                                                        {selectedData === "candidates" ? "candidates" : "Applications"}
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
                    <div className="flex items-center gap-4">
                        <select value={selectedData} onChange={handleChange}>
                            <option value="candidates">Candidate</option>
                            <option value="applications">Application</option>
                        </select>
                    </div>
                </CardFooter>
            </Card>
        );
    }
;

export default CircleChart;