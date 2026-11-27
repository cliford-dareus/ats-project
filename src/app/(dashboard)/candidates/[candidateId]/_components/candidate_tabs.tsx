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
import CandidateInterviews, { type CandidateScheduleOption } from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-interviews";
import AddCandidateAttachmentModal from "@/components/modal/upload_candidate_attachment_modal";
import CandidateExperienceAndEducation from "./candidate-experience-education";
import CandidateDocuments from "@/app/(dashboard)/candidates/[candidateId]/_components/candidate-documents";
import type { NoteType } from "@/types";

type Props = {
    // The detail query returns drizzle rows + scoreCards/attachment, which
    // match no single shared interface (CandidateWithDetails predates
    // those fields) — kept loose like the original, like review pages do.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candidate_details: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candidate_notes: any;
    /** Schedulable applications + interviewer names, resolved in the page
     * loader and passed through untouched. */
    scheduleOptions?: CandidateScheduleOption[];
    interviewerNames?: Record<number, string[]>;
};

type TabValue = "overview" | "experience" | "documents" | "interview";
const DEFAULT_TAB: TabValue = "overview";

/**
 * get_candidate_notes returns a JSON string of the note array (or
 * undefined on error). Parse it once here so the overview tab renders
 * the already-fetched candidate notes instead of re-fetching the wrong
 * (application_) key.
 */
function parseCandidateNotes(value: unknown): NoteType[] {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? (parsed as NoteType[]) : [];
    } catch {
        return [];
    }
}

const CandidateTabs = ({ data, candidate_details, candidate_notes, scheduleOptions, interviewerNames }: Props) => {
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

    // The Mongo details doc carries a single `skills` array (camelCase
    // `resumeSummary` too) — it is the technical-skills list. There is
    // no separate soft-skills source, so softSkills stays empty and the
    // summary renders only non-empty skill blocks.
    const skills: string[] = candidate_details?.skills ?? [];
    const experience = candidate_details?.experience ?? [];
    const education = candidate_details?.education ?? [];

    return (
        <div>
            <div className="flex px-4 ">
                <Tabs className="px-0 h-full w-full" defaultValue="overview" value={activeTab}
                    onValueChange={handleTabChange}>
                    <div className="flex items-center justify-between border-b border-border pb-4">
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
                            technicalSkills={skills}
                            softSkills={[]}
                            resumeSummary={candidate_details?.resumeSummary}
                            candidateNotes={parseCandidateNotes(candidate_notes)}
                        />
                    </TabsContent>
                    <TabsContent value="experience">
                        <CandidateExperienceAndEducation
                            data={data}
                            experience={experience}
                            education={education}
                        />
                    </TabsContent>
                    <TabsContent value="documents">
                        <CandidateDocuments data={data} resumeSummary={candidate_details?.resumeSummary} />
                    </TabsContent>
                    <TabsContent value="interview">
                        <CandidateInterviews
                            data={data}
                            scheduleOptions={scheduleOptions}
                            interviewerNames={interviewerNames}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CandidateTabs;
