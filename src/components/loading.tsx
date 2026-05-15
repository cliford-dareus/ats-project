"use client";

import React from "react";
import { motion } from "motion/react";

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-50">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="flex flex-col items-center gap-12 relative z-10">
                {/* Animated Logo Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative"
                >
                    {/* Pulse effect behind logo */}
                    <motion.div
                        className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    <motion.img
                        src="/apliko_logo.png"
                        alt="Apliko"
                        className="h-20 w-auto relative z-10 drop-shadow-sm"
                        animate={{
                            y: [0, -8, 0],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-6">
                    <div className="w-56 h-1.5 bg-zinc-200 rounded-full overflow-hidden relative">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-brand-600 rounded-full"
                            initial={{ width: "0%", left: "-100%" }}
                            animate={{
                                width: ["20%", "40%", "20%"],
                                left: ["-20%", "100%", "-20%"]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <motion.p
                            className="text-[13px] font-bold text-zinc-900 tracking-tight"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            Preparing Workspace
                        </motion.p>
                        <motion.p
                            className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest"
                            animate={{ opacity: [0.4, 0.7, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            Building your recruitment engine
                        </motion.p>
                    </div>
                </div>

                {/* Subtle decorative dots */}
                <div className="flex gap-2.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-brand-500 rounded-full"
                            animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.3, 1, 0.3],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
