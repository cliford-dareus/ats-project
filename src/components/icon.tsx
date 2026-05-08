import { ICON_MAP } from "@/plugins/registry";
import { Puzzle } from "lucide-react";

type IconProps = {
    name: string;
    className?: string;
};

export const PluginIcon = ({ name, className }: IconProps) => {
    const Icon = ICON_MAP[name.toLowerCase()] || Puzzle;
    return <Icon className={className} />;
};