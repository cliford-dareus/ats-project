'use client';

import { Briefcase, Users, BarChart3, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AplikoMonogram from './aplico-monogram';

const WorkspaceDockStage: React.FC<{
    orgName: string;
    orgDomain: string;
    departments: string[];
}> = ({ orgName, orgDomain, departments }) => {
    const dockApps = [
        { icon: Briefcase, label: 'Jobs', color: 'text-sky-400', active: true },
        { icon: Users, label: 'Candidates', color: 'text-emerald-400', active: true },
        { icon: null, label: 'Apliko', color: 'text-white', active: true },
        { icon: BarChart3, label: 'Reports', color: 'text-amber-400', active: true },
        { icon: Globe, label: 'Portal', color: 'text-primary', active: true }
    ];

    return (
        <div className="flex-1 bg-card border border-border rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col items-center justify-center gap-10 min-h-[520px] lg:min-h-[580px]">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.14),transparent_62%)]"
            />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 text-center space-y-3 max-w-md"
            >
                <p className="text-xs font-medium text-primary">
                    careers.{orgDomain.replace(/^https?:\/\//, '')}
                </p>
                <h3 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-foreground tracking-tight [text-wrap:balance]">
                    All systems connected for {orgName}.
                </h3>
                <p className="text-sm text-muted-foreground">
                    {departments.length} departments synced · Ask Apliko AI enabled · Career portal live
                </p>
            </motion.div>

            {/* Sleek 5-App Connected Dock */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 bg-card border border-border rounded-3xl p-3.5 shadow-2xl shadow-black/60 flex items-center gap-3 sm:gap-4"
            >
                {dockApps.map((app, i) => {
                    const Icon = app.icon;
                    return (
                        <div key={app.label} className="flex flex-col items-center gap-2">
                            <motion.div
                                whileHover={{ y: -4, scale: 1.06 }}
                                transition={{ duration: 0.18 }}
                                className={cn(
                                    'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border',
                                    i === 2
                                        ? 'bg-gradient-to-b from-secondary to-card border-primary/50 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]'
                                        : 'bg-secondary border-border'
                                )}
                                title={app.label}
                            >
                                {i === 2 ? (
                                    <AplikoMonogram className="w-8 h-8 border-none bg-transparent shadow-none" />
                                ) : (
                                    Icon && <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', app.color)} />
                                )}
                            </motion.div>
                            <span className="w-1 h-1 rounded-full bg-foreground/70" aria-hidden="true" />
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
};

export default WorkspaceDockStage;
