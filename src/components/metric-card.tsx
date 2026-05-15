import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";


const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
} as { [key: string]: string };

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
    <div className="bg-card relative p-4 rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-all group">
        <div
            style={{
                backgroundColor: color,
                opacity: 0.5
            }}
            className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl -mr-4 -mt-4 group-hover:bg-primary/10 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-accent/5 rounded-full blur-3xl -ml-4 -mb-4 group-hover:bg-accent/10 transition-all duration-700" />
        <div className="flex items-center justify-between mb-6">
            <div className={cn("w-12 h-12 rounded-md flex items-center justify-center border", colorClasses[`${color}`])}>
                <Icon className="w-6 h-6" />
            </div>
            <button className="text-zinc-300 group-hover:text-zinc-600 transition-colors">
                {/*<MoreVertical className="w-5 h-5" />*/}
            </button>
        </div>
        <div>
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">{title}</p>
            <h4 className="text-3xl font-bold text-zinc-900 mt-2 tracking-tight">{value.toLocaleString()}</h4>
            <div className="flex items-center gap-2 mt-4">
                <div className={cn("flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500")}>
                    {trend > 0 ? (
                        <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                    ) : (
                        <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                    )}
                    <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
                        {Math.abs(trend)}%
                    </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase">from last month</p>
            </div>
        </div>
    </div>
);

export default MetricCard;
