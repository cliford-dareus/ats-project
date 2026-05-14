import { LucideIcon, Puzzle, Zap, Calendar } from "lucide-react";

type IconProps = {
    name: string;
    className?: string;
};

const ICON_MAP: Record<string, LucideIcon> = {
    "Zap": Zap,
    "Calendar": Calendar
}

export const PluginIcon = ({ name, className }: IconProps) => {
    const Icon = ICON_MAP[name] || Puzzle;
    return <Icon className={className} />;
};
