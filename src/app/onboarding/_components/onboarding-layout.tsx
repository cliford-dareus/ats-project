import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Props = {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    colorClass?: string;
};

const OnboardingLayout = ({ children, title, subtitle, icon: Icon, colorClass = "bg-brand-50 text-brand-600" }: Props) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white p-10 rounded-[32px] border border-zinc-200 shadow-xl shadow-zinc-200/50 space-y-8"
    >
        <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", colorClass)}>
                <Icon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
                <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">{subtitle}</p>
            </div>
        </div>
        {children}
    </motion.div>
);

export default OnboardingLayout;
