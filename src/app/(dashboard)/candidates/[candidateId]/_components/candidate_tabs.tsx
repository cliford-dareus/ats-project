"use client";

import React, {useEffect, useCallback} from "react";
import {BriefcaseBusiness, CircleUser} from "lucide-react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {
    CustomTabsTrigger,
    Tabs,
    TabsContent,
    TabsList,
} from "@/components/ui/tabs";
import CandidateSummary from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-summary";
import CandidateApplications from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-applications";
import CandidateInterviews from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-interviews";
import CandidateResume from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-resume";
import AddCandidateAttachmentModal from "@/components/modal/upload_candidate_attachment_modal";

type Props = {
    data: any;
};

type TabValue = "profile" | "resume" | "application" | "interviews";
const DEFAULT_TAB: TabValue = "profile";

const CandidateTabs = ({data}: Props) => {
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
        setActiveTab(tabParam || DEFAULT_TAB);
    }, [searchParams]);

    return (
        <div>
            <div className="flex px-4 ">
                <Tabs className="px-0 h-full w-full" defaultValue="summary" value={activeTab}
                      onValueChange={handleTabChange}>
                        <div className="flex items-center justify-between">
                            <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                                {['profile', 'resume', 'application', 'interviews'].map((tab) => (
                                    <CustomTabsTrigger
                                        key={tab}
                                        className="px-4 flex items-center gap-4"
                                        value={tab}
                                    >
                                        {tab === 'options' ? <BriefcaseBusiness size={20}/> : <CircleUser size={20}/>}
                                        <p>{tab.charAt(0).toUpperCase() + tab.slice(1)}</p>
                                    </CustomTabsTrigger>
                                ))}
                            </TabsList>
                            <AddCandidateAttachmentModal candidateId={data.candidate?.id}/>
                        </div>

                    <TabsContent value="profile">
                        <CandidateSummary data={data}/>
                    </TabsContent>
                    <TabsContent value="resume">
                        <CandidateResume data={data}/>
                    </TabsContent>
                    <TabsContent value="application">
                        <CandidateApplications data={data}/>
                    </TabsContent>
                    <TabsContent value="interviews">
                        <CandidateInterviews data={data}/>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CandidateTabs;
