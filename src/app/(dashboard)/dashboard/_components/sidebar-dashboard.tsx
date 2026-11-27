"use client";

import React from 'react';
import {
    Settings,
    ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


const SidebarDashboard = () => {
    return (
        <div className="flex flex-col overflow-y-auto h-[calc(100vh-125px)]">
            {/* The "Ask Apliko AI" card used to live here: an input and a
                submit button with no backend, quick chips with no onClick,
                and a "What's New / Connect Zapier" card for an integration
                that does not exist. All of it was dead or false, so it was
                removed rather than left pretending to work. */}

            <div className="space-y-6">
                <div className='px-4'>
                    <div
                        className="bg-card rounded-md border border-border p-4 relative overflow-hidden group shadow-sm h-full flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />

                        <div className="relative flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-foreground tracking-wide uppercase">Complete your company profile</h3>
                        </div>

                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed my-2">
                            Personalize your company&apos;s profile, invite team members and setup your company&apos;s career page.
                        </p>


                        <Button
                            asChild
                            className="!p-0 border rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2"
                        >
                            <Link href="/settings/organization">
                                Complete Profile
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SidebarDashboard;
