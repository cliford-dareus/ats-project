"use client"

import {TrendingUp} from "lucide-react";
import {PolarAngleAxis, PolarGrid, Radar, RadarChart} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {useState} from "react";

const chartConfig = {
    desktop: {
        label: "Desktop",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

export interface ChartInterface {
    date: string;
    count: number;
    // fill: string;
};

type Props = {
    hired: ChartInterface[];
    open: ChartInterface[];
};

function Component({hired, open}: Props) {
    const [] = useState();

    return (
        <Card className="h-full rounded">
            <CardHeader className="items-center pb-4">
                <CardTitle>Radar Chart</CardTitle>
                <CardDescription>
                    Showing total visitors for the last 6 months
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <RadarChart data={open}>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent/>}/>
                        <PolarAngleAxis
                            dataKey="date"
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}/>
                        <PolarGrid/>
                        <Radar
                            dataKey="count"
                            fill="var(--color-desktop)"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                    Trending up by 5.2% this month <TrendingUp className="h-4 w-4"/>
                </div>
                <div className="flex items-center gap-2 leading-none text-muted-foreground">
                    January - June 2024
                </div>
            </CardFooter>
        </Card>
    )
}

export default Component