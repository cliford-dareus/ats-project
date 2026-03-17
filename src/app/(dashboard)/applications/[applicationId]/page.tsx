import React from 'react';
import {Briefcase} from "lucide-react";
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { ApplicationResponseType } from "@/types";
import { get_application_notes } from "@/server/queries/mongo/note";
import InternalNoteSection from "@/components/internal-note-section";
import { get_job_listings_stages } from "@/server/queries";
import { get_candidate_details } from '@/server/queries/mongo/candidate-details';
import ApplicationSummary from './_components/application-summary';
import { get_job_by_id_action } from '@/server/actions/job-listings-actions';
import ApplicationDetails from './_components/application-details';
import AppicationHeader from './_components/application-header';
import ApplicationInterviewCard from './_components/application-interview-card';

type Props = {
    params: {
        applicationId: string
    }
};

const Page = async ({ params }: Props) => {
    const { applicationId } = await params;

    const response = await get_application_by_id_action(Number(applicationId));
    const applicationResult = (response as unknown as ApplicationResponseType[])[0];

    const stages = await get_job_listings_stages(applicationResult?.job_id);
    const internalNotes = await get_application_notes({
        id: applicationResult.id,
        limit: 10,
        offset: 0
    });

    const jobResponse = await get_job_by_id_action(applicationResult.job_id);
    const job = (Array.isArray(jobResponse) ? jobResponse : [])[0];
    const rawResponse = await get_candidate_details(applicationResult.candidate_id);
    const candidateDetails = JSON.parse(rawResponse);

    return (
        <div className="p-4">
            <div className="flex-1">
                <div className="mt-4">
                    <div className="">
                        {/* Header */}
                        <AppicationHeader applicationResult={applicationResult} stages={stages} />
                        
                        <div className="grid grid-cols-3 gap-4 mt-2">
                            {/* Left Column: Application Summary And Candidate experience */}
                            <ApplicationSummary
                                applicationSummary={candidateDetails}
                                candidate_id={applicationResult.candidate_id}
                                jobSkills={job?.job_technologies}
                            />

                            {/* Right Column: Sidebar Info */}
                            <div className="space-y-4">
                                {/* Application Details */}
                                <ApplicationDetails applicationResult={applicationResult} />

                                {/* Interview Status */}
                                <ApplicationInterviewCard applicationResult={applicationResult} />

                                {/* Job Details Quick View */}
                                <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-brand-400" />
                                        <h3 className="font-bold text-sm uppercase tracking-wider">Job
                                            Overview</h3>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold leading-tight">{applicationResult.job_apply}</p>
                                        <p className="text-zinc-400 text-sm">{applicationResult.department}</p>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">Location</span>
                                            <span
                                                className="font-medium">{applicationResult.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">Type</span>
                                            <span className="font-medium">Full-Time</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Internal Notes Quick View */}
                                <InternalNoteSection
                                    data={JSON.parse(internalNotes)}
                                    parent_type='application'
                                    parent_id={applicationResult.id}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page;
