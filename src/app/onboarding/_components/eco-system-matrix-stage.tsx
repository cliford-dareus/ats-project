"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Users, Calendar, FileText, Globe, MessageSquare, Search, Sparkles, BarChart3, Layers, Mail, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import AplikoMonogram from './aplico-monogram';
import FloatingCursor from './floating-cursor';

const EcosystemMatrixStage: React.FC<{ onQuickStart: () => void }> = ({ onQuickStart }) => {
    const [activeTile, setActiveTile] = useState<number>(7);
    const [promptIndex, setPromptIndex] = useState(0);

    const samplePrompts = [
        'Match top Frontend Engineers to our Q4 pipeline...',
        'Publish career portal with Engineering & Design roles...',
        'Schedule panel interviews and send scorecard links...'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setPromptIndex((prev) => (prev + 1) % samplePrompts.length);
        }, 3400);
        return () => clearInterval(interval);
    }, []);

    const tiles = [
        { icon: Briefcase, label: 'Jobs', tint: 'text-sky-400' },
        { icon: Users, label: 'Candidates', tint: 'text-emerald-400' },
        { icon: Calendar, label: 'Interviews', tint: 'text-amber-400' },
        { icon: FileText, label: 'Resumes', tint: 'text-violet-400' },
        { icon: Globe, label: 'Portal', tint: 'text-teal-400' },
        { icon: MessageSquare, label: 'Inbox', tint: 'text-rose-400' },
        { icon: Search, label: 'Sourcing', tint: 'text-cyan-400' },
        { icon: null, label: 'Apliko Core', tint: 'text-white' }, // Center Hero Tile (idx 7)
        { icon: Sparkles, label: 'Apliko AI', tint: 'text-primary' },
        { icon: BarChart3, label: 'Reports', tint: 'text-indigo-400' },
        { icon: Layers, label: 'Workflows', tint: 'text-orange-400' },
        { icon: Mail, label: 'Outreach', tint: 'text-lime-400' },
        { icon: Building2, label: 'Teams', tint: 'text-blue-400' },
        { icon: CheckCircle2, label: 'Offers', tint: 'text-emerald-400' },
        { icon: ArrowRight, label: 'Publish', tint: 'text-zinc-300' }
    ];

    return (
        <div className="flex-1 bg-card border border-border rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col justify-between min-h-[520px] lg:min-h-[580px]">
            {/* Subtle center radial spotlight */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.12),transparent_60%)]"
            />

            {/* Animated Collaborator Cursors */}
            <FloatingCursor
                name="Apliko AI"
                color="#0099FF"
                positions={[
                    { x: 420, y: 120 },
                    { x: 330, y: 245 },
                    { x: 445, y: 310 },
                    { x: 420, y: 120 }
                ]}
                duration={8}
            />
            <FloatingCursor
                name="Hiring Lead"
                color="#E06D53"
                positions={[
                    { x: 110, y: 320 },
                    { x: 195, y: 185 },
                    { x: 140, y: 125 },
                    { x: 110, y: 320 }
                ]}
                duration={9.5}
            />

            {/* Top Subtle Context Line */}
            <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground">
                <span>Connected Recruiting Canvas</span>
                <span className="font-mono tabular-nums text-foreground/70">15 modules</span>
            </div>

            {/* 5x3 Tactile Tile Matrix */}
            <div className="relative z-10 my-auto py-8 flex items-center justify-center">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 max-w-[480px] w-full">
                    {tiles.map((tile, idx) => {
                        const isCenter = idx === 7;
                        const isActive = activeTile === idx;
                        const Icon = tile.icon;

                        return (
                            <motion.button
                                key={tile.label}
                                type="button"
                                onMouseEnter={() => setActiveTile(idx)}
                                onClick={onQuickStart}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35, delay: idx * 0.025 }}
                                whileHover={{ y: -2, scale: 1.04 }}
                                className={cn(
                                    'aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-colors cursor-pointer relative',
                                    isCenter
                                        ? 'bg-gradient-to-b from-secondary to-card border-primary/50 shadow-[0_0_32px_-6px_hsl(var(--primary)/0.35)]'
                                        : isActive
                                            ? 'bg-secondary border-border'
                                            : 'bg-card border-border hover:border-border'
                                )}
                            >
                                {isCenter ? (
                                    <AplikoMonogram className="w-9 h-9 border-primary/40" />
                                ) : (
                                    Icon && <Icon className={cn('w-5 h-5', tile.tint)} />
                                )}
                                <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[90%]">
                                    {tile.label}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Floating Bottom Command Bar (Inspired by Framer AI bar) */}
            <div className="relative z-10 max-w-lg mx-auto w-full">
                <button
                    type="button"
                    onClick={onQuickStart}
                    className="w-full bg-card hover:bg-secondary border border-border rounded-2xl p-3.5 pl-4 flex items-center justify-between gap-3 shadow-xl shadow-black/50 transition-colors cursor-pointer text-left group"
                >
                    <div className="min-w-0 flex-1">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={promptIndex}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs sm:text-sm text-foreground truncate"
                            >
                                {samplePrompts[promptIndex]}
                            </motion.p>
                        </AnimatePresence>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>Ask Apliko</span>
                            <span aria-hidden="true">·</span>
                            <span>Instant workspace setup</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default EcosystemMatrixStage;