"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

const LogoScene = () => {
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
            className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-dark)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            <div className="relative flex flex-col items-center justify-center">
                {/* Core Logo Reveal */}
                <motion.div
                    className="relative"
                    initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                    animate={phase >= 1 ? { scale: 1, opacity: 1, filter: "blur(0px)" } : { scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                    <Image
                        src="/apliko_logo.png"
                        width={500}
                        height={500}
                        className="w-auto h-[12vw] object-contain relative z-20"
                        alt="Picture of the author"
                    />

                    {/* Logo Glow */}
                    <motion.div
                        className="absolute inset-0 bg-[var(--color-accent)] blur-[40px] z-10 rounded-full"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={phase >= 2 ? { opacity: 0.4, scale: 1.2 } : { opacity: 0, scale: 0.5 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </motion.div>

                {/* Shine Sweep over logo */}
                {phase >= 2 && (
                    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden mask-image-logo">
                        <motion.div
                            className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                    </div>
                )}

            </div>
        </motion.div>
    )
};

export default LogoScene;
