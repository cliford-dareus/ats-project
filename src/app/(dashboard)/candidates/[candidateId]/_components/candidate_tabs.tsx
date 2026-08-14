"use client";

import React, { useEffect, useCallback } from "react";
import {Building2, Calendar, FileText, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    CustomTabsTrigger,
    Tabs,
    TabsContent,
    TabsList,
} from "@/components/ui/tabs";
import CandidateSummary from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-summary";
import CandidateInterviews from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-interviews";
import AddCandidateAttachmentModal from "@/components/modal/upload_candidate_attachment_modal";
import CandidateExperienceAndEducation from "./candidate-experience-education";
import CandidateDocuments from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-documents";

type Props = {
    data: any;
    candidate_details: any;
    candidate_notes: any;
};

type TabValue = "overview" | "experience" | "documents" | "interview";
const DEFAULT_TAB: TabValue = "overview";

const CandidateTabs = ({ data, candidate_details, candidate_notes }: Props) => {
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
                <Tabs className="px-0 h-full w-full" defaultValue="overview" value={activeTab}
                    onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                        <TabsList className="bg-transparent rounded-none p-0 border-b w-full justify-start">
                            {[
                                { id: 'overview', label: 'Profile Overview', icon: User },
                                { id: 'experience', label: 'Experience & Education', icon: Building2 },
                                { id: 'interview', label: 'Interviews & Assessment', icon: Calendar },
                                { id: 'documents', label: 'Resume & Docs', icon: FileText },
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
                        <AddCandidateAttachmentModal candidateId={data.candidate?.id} />
                    </div>

                    <TabsContent value="overview">
                        <CandidateSummary
                            data={data}
                            technicalSkills={[]}
                            softSkills={candidate_details?.skills}
                            resumeSummary={candidate_details?.resume_summary}
                        />
                    </TabsContent>
                    <TabsContent value="experience">
                        <CandidateExperienceAndEducation
                            data={data}
                            experience={candidate_details?.experience}
                            education={candidate_details?.education}
                        />
                    </TabsContent>
                    <TabsContent value="documents">
                        <CandidateDocuments data={data} resumeSummary={candidate_details?.resume_summary} />
                    </TabsContent>
                    <TabsContent value="interview">
                        <CandidateInterviews data={data} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CandidateTabs;
