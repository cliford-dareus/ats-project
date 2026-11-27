import React from "react";
import CommunicationPageClient from "./_components/communication-page-client";
import { fetchCommunicationPageData } from "@/server/actions/communication-actions";
import { ShieldCheck } from "lucide-react";
import { and, eq, isNull } from "drizzle-orm";
import { candidates } from "@/drizzle/schema";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { get_org_members_action } from "@/server/actions/organization_actions";


const CommunicationPage = async () => {
    const { templates, systemTemplates, threads } = await fetchCommunicationPageData();

    const { orgId } = await auth();
    // No session org (e.g. signed-out render) — no candidates to list.
    const all_candidates = orgId
        ? await db.select().from(candidates).where(and(eq(candidates.organization, orgId), isNull(candidates.deleted_at)))
        : [];
    // Real org members for the @mention picker (replaces the hardcoded demo users).
    const users = await get_org_members_action();
    return (
        <div className="container mx-auto py-6 px-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
                {/* Page Header Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">Candidate Communications</h1>
                            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Inbox Sync
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                            Centralized email messaging, interview invites, team @mentions, and AI response drafting.
                        </p>
                    </div>

                    {/* Integration Status Badge */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-card border border-border rounded-2xl text-xs font-bold text-foreground shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>Gmail / Workspace Connected</span>
                        </div>
                    </div>
                </div>

                <CommunicationPageClient
                    templates={templates}
                    systemTemplates={systemTemplates}
                    logs={threads}
                    candidates={all_candidates}
                    users={users}
                />
            </div>
        </div>
    );
};

export default CommunicationPage;
