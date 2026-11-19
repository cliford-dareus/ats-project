import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type Props = {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    colorClass?: string;
};

const OnboardingLayout = ({
    children,
    title,
    subtitle,
    icon: Icon,
    colorClass = "bg-primary/10 text-primary",
}: Props) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-card text-card-foreground p-6 sm:p-10 rounded-3xl border border-border shadow-xl shadow-black/5 space-y-8"
    >
        <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", colorClass)}>
                <Icon className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">{subtitle}</p>
            </div>
        </div>
        {children}
    </motion.div>
);

export default OnboardingLayout;
