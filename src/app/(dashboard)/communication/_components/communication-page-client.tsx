"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommunicationInbox from "./communication-inbox";
import CommunicationTemplates from "./communication-templates";
import ComposeEmailDialog from "./compose-email-dialog";
import { CustomTabsTrigger, Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { CandidateType, EmailTemplateDTO, ThreadItem } from "@/types";
import { MentionUser } from "@/components/mentions-text-area";

type Props = {
    templates: EmailTemplateDTO[];
    systemTemplates: {
        name: string;
        body: string;
        subject: string;
        templateId: string;
        isSystem?: boolean;
    }[];
    logs: ThreadItem[];
    candidates: CandidateType[];
    users: MentionUser[];
};

type TabValue = "inbox" | "templates";
const DEFAULT_TAB: TabValue = "inbox";

const CommunicationPageClient = ({
    logs,
    candidates,
    templates,
    systemTemplates,
    users
}: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabValue>(DEFAULT_TAB);
    const [composeOpen, setComposeOpen] = useState(false);

    const refresh = () => router.refresh();

    const handleTabChange = useCallback((value: string) => {
        const newPath = value === DEFAULT_TAB
            ? pathname
            : `${pathname}?tab=${value}`;
        router.push(newPath);
    }, [pathname, router]);

    useEffect(() => {
        const tabParam = searchParams.get('tab') as TabValue;
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div className="space-y-6">
            <Tabs className="px-0 h-full w-full" defaultValue="overview" value={activeTab}
                onValueChange={handleTabChange}>
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                        {[
                            { id: 'inbox', label: 'Inbox', icon: User },
                            { id: 'templates', label: 'Templates', icon: FileText },
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

                    <Button onClick={() => setComposeOpen(true)}>Compose</Button>
                </div>

                <TabsContent value="inbox">
                    <CommunicationInbox logs={logs} templates={templates} systemTemplates={systemTemplates} users={users} />
                </TabsContent>

                <TabsContent value="templates">
                    <CommunicationTemplates
                        templates={templates}
                        systemTemplates={systemTemplates}
                        onRefresh={refresh}
                    />
                </TabsContent>
            </Tabs>

            <ComposeEmailDialog
                open={composeOpen}
                onOpenChange={setComposeOpen}
                templates={templates}
                systemTemplates={systemTemplates}
                onSent={refresh}
                candidates={candidates}
            />
        </div>
    );
};

export default CommunicationPageClient;
