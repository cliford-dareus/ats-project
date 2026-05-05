import React from 'react';
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { ApplicationResponseType, JobExperienceType } from "@/types";
// import { get_application_notes } from "@/server/queries/mongo/note";
import InternalNoteSection from "@/components/internal-note-section";
import { get_job_listings_stages } from "@/server/queries";
import { get_candidate_details } from '@/server/queries/mongo/candidate-details';
import { ApplicationSummary, ApplicationExperienceMatch, EmptyApplicationSummary, ApplicationExperience } from './_components/application-summary';
import { get_job_by_id_action } from '@/server/actions/job-listings-actions';
import ApplicationDetails from './_components/application-details';
import AppicationHeader from './_components/application-header';
import ApplicationInterviewCard from './_components/application-interview-card';
import JobQuickViewCard from '@/components/job-quick-view-card';

type Props = {
    params: Promise<{
        applicationId: string
    }>
};

const Page = async ({ params }: Props) => {
    const { applicationId } = await params;

    const response = await get_application_by_id_action(Number(applicationId));
    const applicationResult = (response as unknown as ApplicationResponseType[])[0];
    
    const stages = await get_job_listings_stages(applicationResult.job_id);
    // const internalNotes = await get_application_notes({
    //     id: Number(applicationId),
    //     limit: 10,
    //     offset: 0
    // });

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
                            {!candidateDetails.experience ||
                            !candidateDetails.skills ||
                            !candidateDetails.education ||
                            !candidateDetails.resumeSummary ? (
                              <div className="col-span-2 space-y-4">
                                <EmptyApplicationSummary
                                  candidate_id={applicationResult.candidate_id}
                                />
                              </div>
                            ) : (
                              <div className="col-span-2 space-y-4">
                                <ApplicationExperienceMatch
                                  candidate_id={applicationResult.candidate_id}
                                  experience={candidateDetails.experience}
                                  jobSkills={
                                    job.job_technologies as unknown as JobExperienceType[]
                                  }
                                />

                                <ApplicationSummary candidate_id={applicationResult.candidate_id} resumeSummary={candidateDetails.resumeSummary} />
                                <ApplicationExperience experience={candidateDetails.experience} />
                              </div>
                            )}

                            {/* Right Column: Sidebar Info */}
                            <div className="space-y-4">
                                {/* Application Details */}
                                <ApplicationDetails applicationResult={applicationResult} />

                                {/* Interview Status */}
                                <ApplicationInterviewCard applicationResult={applicationResult} />

                                {/* Job Details Quick View */}
                                <JobQuickViewCard
                                    name={applicationResult.job_apply}
                                    department={applicationResult.department}
                                    location={applicationResult.location}
                                    type={applicationResult.type}
                                />

                                {/* Internal Notes Quick View */}
                                <InternalNoteSection
                                    parent_type='application'
                                    parent_id={applicationResult.id}
                                    selectedId={applicationResult.id}
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
