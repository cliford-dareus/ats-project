"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
    Users, FileText, Search, CheckCircle, Briefcase,
    BarChart2, Calendar, Award, Mail, Star,
} from 'lucide-react';

const ATS_ICONS = [
    { Icon: Users, label: 'Candidates', angle: 0 },
    { Icon: FileText, label: 'Resume', angle: 36 },
    { Icon: Search, label: 'Search', angle: 72 },
    { Icon: CheckCircle, label: 'Screened', angle: 108 },
    { Icon: Briefcase, label: 'Jobs', angle: 144 },
    { Icon: BarChart2, label: 'Analytics', angle: 180 },
    { Icon: Calendar, label: 'Interviews', angle: 216 },
    { Icon: Award, label: 'Hired', angle: 252 },
    { Icon: Mail, label: 'Outreach', angle: 288 },
    { Icon: Star, label: 'Top Talent', angle: 324 },
];

const OrbitIcon = ({
    Icon, label, angle, phase, index,
}: {
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    angle: number;
    phase: number;
    index: number;
}) => {
    const rad = (angle * Math.PI) / 180;
    const orbitR = 36; // vw units
    const x = Math.cos(rad) * orbitR;
    const y = Math.sin(rad) * orbitR;

    return (
        <motion.div
            className="absolute flex flex-col items-center gap-1 pointer-events-none"
            style={{ left: '50%', top: '50%' }}
            initial={{ opacity: 0, x: `${x * 0.6}vw`, y: `${y * 0.6}vh`, scale: 0.4 }}
            animate={
                phase >= 2
                    ? { opacity: 1, x: `${x}vw`, y: `${y}vh`, scale: 1 }
                    : { opacity: 0, x: `${x * 0.6}vw`, y: `${y * 0.6}vh`, scale: 0.4 }
            }
            transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.15 + index * 0.07,
            }}
        >
            <motion.div
                className="w-[3.8vw] h-[3.8vw] rounded-xl flex items-center justify-center border bg-primary/10 backdrop-blur-sm"
                // style={{ background: 'rgba(255,255,255,0.07)' }}
                animate={phase >= 2 ? { y: [0, -4, 0] } : {}}
                transition={{
                    repeat: Infinity,
                    duration: 3 + index * 0.25,
                    ease: 'easeInOut',
                    delay: index * 0.18,
                }}
            >
                <Icon className="w-[1.8vw] h-[1.8vw] text-primary" />
            </motion.div>
            <motion.span
                className="text-[0.75vw] text-foreground/50 font-medium tracking-wide uppercase whitespace-nowrap"
                initial={{ opacity: 0 }}
                animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.4 + index * 0.07, duration: 0.4 }}
            >
                {label}
            </motion.span>
        </motion.div>
    );
}

const IntroScene = () => {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 500), // Logo reveals
            setTimeout(() => setPhase(2), 1500), // Glow/shine effect
            setTimeout(() => setPhase(3), 4000), // Exit
        ];
        return () => timers.forEach(t => clearTimeout(t));
    }, []);

    return (
        <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
        >
            {/* Decorative corporate lines */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <motion.div
                    className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
                    initial={{ width: 0, opacity: 0 }}
                    animate={phase >= 1 ? { width: '80vw', opacity: 0.5 } : { width: 0, opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ top: '40%' }}
                />
                <motion.div
                    className="absolute w-[1px] bg-gradient-to-b from-transparent via-primary to-transparent"
                    initial={{ height: 0, opacity: 0 }}
                    animate={phase >= 1 ? { height: '80vh', opacity: 0.3 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    style={{ left: '30%' }}
                />
            </div>

            {/* Orbit icons */}
            <div className="absolute inset-0" style={{ transform: 'translateY(-2vh)' }}>
                {ATS_ICONS.map(({ Icon, label, angle }, i) => (
                    <OrbitIcon
                        key={label}
                        Icon={Icon}
                        label={label}
                        angle={angle}
                        phase={phase}
                        index={i}
                    />
                ))}
            </div>

            <div className="relative z-10 text-center flex flex-col items-center">
                <motion.div
                    className="overflow-hidden mb-4"
                >
                    <motion.p
                        className="text-[1.5vw] text-[var(--color-text-secondary)] uppercase tracking-[0.3em] font-semibold"
                        initial={{ y: "100%" }}
                        animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        Data-driven
                    </motion.p>
                </motion.div>

                <motion.div className="overflow-hidden">
                    <motion.h1
                        className="text-[6vw] font-display font-bold leading-none tracking-tight text-[var(--color-text-primary)]"
                        initial={{ y: "100%" }}
                        animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    >
                        Hiring Precision
                    </motion.h1>
                </motion.div>
            </div>
        </motion.div>
    )
};

export default IntroScene;
