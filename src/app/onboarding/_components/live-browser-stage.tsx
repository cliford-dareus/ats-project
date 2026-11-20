'use client';

import React from 'react';
import { Briefcase, Users, Globe, Sparkles } from 'lucide-react';
import AplikoMonogram from './aplico-monogram';
import FloatingCursor from './floating-cursor';
import { InvitedMember, OnboardingStep } from './onboarding';

export const CURSOR_COLORS = ['#FF6B6B', '#4ECDC4', '#556270', '#C7F464', '#FF6B6B'];

const LiveBrowserStage: React.FC<{
    step: OnboardingStep;
    orgName: string;
    orgDomain: string;
    departments: string[];
    invitedMembers: InvitedMember[];
}> = ({ step, orgName, orgDomain, departments, invitedMembers }) => {
    const displayOrg = (orgName ?? '').trim() || 'Your Organization';
    const cleanDomain = ((orgDomain ?? "").trim() || 'yourcompany.com').replace(/^https?:\/\//, '');

    const sampleRolesByDept: Record<string, { title: string; location: string; type: string }> = {
        Engineering: { title: 'Senior Full-Stack Engineer', location: 'Remote', type: 'Full-time' },
        Design: { title: 'Staff Product Designer', location: 'New York · Hybrid', type: 'Full-time' },
        Product: { title: 'Lead Product Manager', location: 'San Francisco', type: 'Full-time' },
        Growth: { title: 'Head of Growth Marketing', location: 'Remote', type: 'Full-time' },
        Operations: { title: 'Talent Operations Specialist', location: 'London', type: 'Full-time' },
        People: { title: 'Senior Technical Recruiter', location: 'Remote', type: 'Full-time' }
    };

    const previewRoles = departments.slice(0, 3).map((dept) => {
        const preset = sampleRolesByDept[dept];
        if (preset) return { dept, ...preset };
        return {
            dept,
            title: `${dept} Lead`,
            location: 'Remote',
            type: 'Full-time'
        };
    });

    const actionNote = (() => {
        switch (step) {
            case 'organization':
                return 'Select an existing workspace or initialize a fresh organization';
            case 'create':
                return `Configuring workspace identity for ${displayOrg}`;
            case 'department':
                return `Syncing ${departments.length} active hiring departments to your portal`;
            case 'invite':
                return invitedMembers.length > 0
                    ? `${invitedMembers.length} collaborator${invitedMembers.length > 1 ? 's' : ''} connected to workspace preview`
                    : 'Add hiring leads to enable collaborative scorecards';
            case 'join':
                return `Preparing access request for ${displayOrg}`;
            default:
                return 'Live workspace preview';
        }
    })();

    return (
        <div className="flex-1 bg-card border border-border rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] lg:min-h-[580px]">
            {/* Live Multiplayer Cursors */}
            <FloatingCursor
                name={displayOrg.split(' ')[0] || 'Admin'}
                color="#0099FF"
                positions={[
                    { x: 410, y: 185 },
                    { x: 270, y: 285 },
                    { x: 455, y: 360 },
                    { x: 410, y: 185 }
                ]}
                duration={8.5}
            />

            {invitedMembers.slice(0, 2).map((member, idx) => (
                <FloatingCursor
                    key={member.id}
                    name={member.email.split('@')[0]}
                    color={CURSOR_COLORS[(idx + 1) % CURSOR_COLORS.length]}
                    positions={
                        idx === 0
                            ? [
                                { x: 150, y: 335 },
                                { x: 315, y: 150 },
                                { x: 220, y: 260 },
                                { x: 150, y: 335 }
                            ]
                            : [
                                { x: 470, y: 265 },
                                { x: 360, y: 390 },
                                { x: 495, y: 140 },
                                { x: 470, y: 265 }
                            ]
                    }
                    duration={7.5 + idx * 1.5}
                />
            ))}

            {/* Browser / App Window Frame */}
            <div className="flex-1 bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/40 relative z-10">
                {/* Top Browser Chrome */}
                <div className="h-11 px-4 border-b border-border bg-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                        <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                        <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                        <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
                    </div>

                    <div className="flex-1 max-w-xs bg-card border border-border rounded-lg px-3 py-1 text-center truncate">
                        <span className="font-mono text-[11px] text-muted-foreground">
                            careers.{cleanDomain}
                        </span>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                        Publish
                    </div>
                </div>

                {/* Inner Workspace Split Preview */}
                <div className="flex-1 grid grid-cols-12 min-h-0">
                    {/* Mini Left Sidebar */}
                    <div className="hidden sm:flex sm:col-span-4 border-r border-border bg-card p-4 flex-col justify-between">
                        <div className="space-y-5">
                            <div className="flex items-center gap-2.5">
                                <AplikoMonogram className="w-7 h-7 shrink-0" />
                                <span className="text-xs font-bold text-foreground truncate">{displayOrg}</span>
                            </div>

                            <div className="space-y-1 text-xs">
                                <div className="px-2.5 py-1.5 rounded-lg bg-secondary text-foreground font-medium flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                    <span>Career Portal</span>
                                </div>
                                <div className="px-2.5 py-1.5 rounded-lg text-muted-foreground flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    <span>Open Roles</span>
                                </div>
                                <div className="px-2.5 py-1.5 rounded-lg text-muted-foreground flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Candidates</span>
                                </div>
                            </div>

                            {/* Live Departments List */}
                            <div className="space-y-2 pt-2 border-t border-border">
                                <p className="text-[11px] font-medium text-muted-foreground px-1">Departments</p>
                                <div className="space-y-1">
                                    {departments.map((dept) => (
                                        <div
                                            key={dept}
                                            className="px-2.5 py-1 text-xs text-foreground flex items-center justify-between"
                                        >
                                            <span className="truncate">{dept}</span>
                                            <span className="font-mono tabular-nums text-[10px] text-muted-foreground">1</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
                            {invitedMembers.length > 0 ? (
                                <span className="text-foreground tabular-nums">
                                    {invitedMembers.length + 1} team members
                                </span>
                            ) : (
                                <span>1 workspace owner</span>
                            )}
                        </div>
                    </div>

                    {/* Mini Career Portal Canvas */}
                    <div className="col-span-12 sm:col-span-8 p-5 sm:p-6 flex flex-col justify-between bg-card/60">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <p className="text-xs text-primary font-medium">{displayOrg} Careers</p>
                                <h3 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-bold text-foreground tracking-tight [text-wrap:balance]">
                                    Build the future with {displayOrg}.
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                                    Explore open roles across {departments.slice(0, 3).join(', ')}
                                    {departments.length > 3 ? ` +${departments.length - 3} more` : ''}.
                                </p>
                            </div>

                            {/* Dynamic Open Roles Preview List */}
                            <div className="divide-y divide-border border-y border-border">
                                {previewRoles.map((role) => (
                                    <div key={role.dept} className="py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{role.title}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {role.dept} · {role.location} · {role.type}
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-medium text-primary shrink-0">Apply →</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Floating Status Prompt inside Preview */}
                        <div className="mt-5 bg-card border border-border rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-xs text-foreground truncate">{actionNote}</span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">Live</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveBrowserStage;
