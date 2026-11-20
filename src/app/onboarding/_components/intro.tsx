"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Intro = () => {
    const headlineWords = ['Your team.', 'Your pipeline.', 'Your workspace.'];
    const router = useRouter();

    const onNext = () => {
        router.push("/onboarding?step=organization");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
        >
            <div className="space-y-4">
                <div className="space-y-1">
                    {headlineWords.map((phrase, idx) => (
                        <motion.h1
                            key={phrase}
                            initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                            transition={{
                                duration: 0.45,
                                delay: idx * 0.1,
                                ease: [0.16, 1, 0.3, 1]
                            }}
                            className={cn(
                                "font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-bold tracking-tight leading-[1.12] [text-wrap:balance]",
                                idx === 2 ? 'text-primary' : 'text-foreground'
                            )}
                        >
                            {phrase}
                        </motion.h1>
                    ))}
                </div>
                <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md">
                    Set up your hiring organization, structure open departments, and invite collaborators into a connected ATS canvas.
                </p>
            </div>

            {/* Clean hairline-separated workflow capabilities */}
            <div className="divide-y divide-border border-y border-border">
                {[
                    {
                        icon: Briefcase,
                        title: 'Structured Job Pipelines',
                        desc: 'Launch roles with automated stage triggers'
                    },
                    {
                        icon: Sparkles,
                        title: 'Apliko AI Copilot',
                        desc: 'Screen candidates and build interview kits'
                    },
                    {
                        icon: Globe,
                        title: 'Custom Career Portal',
                        desc: 'Publish a branded hiring site in one click'
                    }
                ].map((item) => (
                    <div key={item.title} className="py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                onClick={onNext}
                className="w-full py-3.5 px-6 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
        </motion.div>
    );
};

export default Intro;
