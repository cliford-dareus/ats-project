import React from "react";
import CommunicationPageClient from "./_components/communication-page-client";
import { fetchCommunicationPageData } from "@/server/actions/communication-actions";
import { ShieldCheck } from "lucide-react";
import { eq } from "drizzle-orm";
import { candidates } from "@/drizzle/schema";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";


const CommunicationPage = async () => {
    const { templates, systemTemplates, threads } = await fetchCommunicationPageData();
    
    const { orgId } = await auth();
    const all_candidates = await db.select().from(candidates).where(eq(candidates.organization, orgId));
    return (
        <div className="container mx-auto py-6 px-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
                {/* Page Header Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Candidate Communications</h1>
                            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Inbox Sync
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                            Centralized email messaging, interview invites, team @mentions, and AI response drafting.
                        </p>
                    </div>

                    {/* Integration Status Badge */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-700 shadow-sm">
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
                />
            </div>
        </div>
    );
};

export default CommunicationPage;
