"use client";

import React, { useCallback, useEffect } from 'react';
import { CustomTabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
    FilePlus2,
    FileText,
    User
} from "lucide-react";
import ReportHistory from './report-history';
import ReportGenerator from './report-generator';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ReportOverview from './report-overview';
import type { ReportDataset, ReportRange } from '@/server/actions/reports-actions';

interface Props {
    reportData: ReportDataset;
    range: ReportRange;
};

type TabValue = "overview" | "generate" | "history";
const DEFAULT_TAB: TabValue = "overview";
const TABS: TabValue[] = ["overview", "generate", "history"];

const ReportsComponent = ({ reportData, range }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TAB);

    const handleTabChange = useCallback((value: string) => {
        const newPath = value === DEFAULT_TAB
            ? pathname
            : `${pathname}?tab=${value}`;
        router.push(newPath);
    }, [pathname, router]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(TABS.includes(tabParam) ? tabParam : DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div className="my-6">
            <div className="flex">
                <Tabs className="px-0 h-full w-full" defaultValue="overview" value={activeTab}
                    onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                            {[
                                { id: 'overview', label: 'Overview', icon: User },
                                { id: 'generate', label: 'Generate', icon: FilePlus2 },
                                { id: 'history', label: 'History', icon: FileText },
                            ].map((tab) => (
                                <CustomTabsTrigger
                                    key={tab.id}
                                    className="px-4 flex items-center gap-4 py-2 rounded-lg text-xs font-bold transition-all text-[10px] uppercase tracking-widest"
                                    value={tab.id}
                                >
                                    <tab.icon size={18} />
                                    <p>{tab.label}</p>
                                </CustomTabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <TabsContent value="overview">
                        <ReportOverview reportData={reportData} range={range} />
                    </TabsContent>

                    <TabsContent value="generate">
                        <ReportGenerator />
                    </TabsContent>

                    <TabsContent value="history">
                        <ReportHistory />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ReportsComponent;
