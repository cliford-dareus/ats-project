import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {ArrowDownRight, ArrowUpRight} from "lucide-react";

const MetricCard = ({
                        title,
                        value,
                        trend,
                        icon: Icon,
                        color = "blue"
                    }: {
    title: string;
    value: number;
    trend: number;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
}) => (
    <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
            </CardTitle>
            <Icon className={cn("h-4 w-4", `text-${color}-600`)} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
                {trend > 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                )}
                <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(trend)}%
                    </span>
                <span className="ml-1">from last month</span>
            </div>
        </CardContent>
    </Card>
);

export default MetricCard;