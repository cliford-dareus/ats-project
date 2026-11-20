import React from "react";
import { motion } from "motion/react";

export function LoadingScreen() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070709] text-zinc-100">
            {/* Subtle architectural grid */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-brand-500/[0.06] blur-[140px]"
            />

            <div className="flex flex-col items-center gap-8 relative z-10">
                {/* Monogram Logo */}
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/15 flex items-center justify-center shadow-2xl shadow-black/60"
                >
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" aria-hidden="true">
                        <path d="M5 4H19L14.5 9.5H5V4Z" fill="currentColor" />
                        <path d="M5 11.5H13.5L9 17H5V11.5Z" fill="#14B8A6" />
                        <path d="M5 17H9V20L5 17Z" fill="currentColor" fillOpacity="0.85" />
                    </svg>
                </motion.div>

                {/* Progress Bar + Label */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-1 bg-white/[0.08] rounded-full overflow-hidden relative">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-brand-500 rounded-full"
                            initial={{ width: "25%", left: "-25%" }}
                            animate={{
                                width: ["25%", "45%", "25%"],
                                left: ["-25%", "100%", "-25%"]
                            }}
                            transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-1 text-center">
                        <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white tracking-tight">
                            Apliko
                        </p>
                        <p className="text-xs text-zinc-500">
                            Loading your hiring workspace
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
