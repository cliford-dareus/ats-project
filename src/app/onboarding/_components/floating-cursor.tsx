'use client';

import React from 'react';
import { motion } from 'framer-motion';

const FloatingCursor: React.FC<{
    name: string;
    color: string;
    positions: { x: number; y: number }[];
    duration?: number;
}> = ({ name, color, positions, duration = 8 }) => {
    return (
        <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-30 hidden md:flex items-start will-change-transform"
            animate={{
                x: positions.map((p) => p.x),
                y: positions.map((p) => p.y)
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
        >
            <svg
                width="16"
                height="18"
                viewBox="0 0 16 18"
                fill="none"
                className="drop-shadow-md -mt-1 -mr-0.5"
            >
                <path
                    d="M1.5 1.5L6.2 15.5L8.6 9.8L14.5 7.5L1.5 1.5Z"
                    fill={color}
                    stroke="#070709"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
            <span
                className="mt-3 ml-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-lg whitespace-nowrap"
                style={{ backgroundColor: color }}
            >
                {name}
            </span>
        </motion.div>
    );
};

export default FloatingCursor;
