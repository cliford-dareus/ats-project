import React from 'react';
import { get_application_by_id_action } from "@/server/actions/application_actions";
import { ApplicationResponseType, JobExperienceType } from "@/types";
import InternalNoteSection from "@/components/internal-note-section";
import { get_job_listings_stages_action } from "@/server/actions/job-listings-actions";
import { get_candidate_details } from '@/server/queries/mongo/candidate-details';
import { ApplicationSummary, ApplicationExperienceMatch, EmptyApplicationSummary, ApplicationExperience, ApplicationSoftSkills } from './_components/application-summary';
import { get_job_by_id_action } from '@/server/actions/job-listings-actions';
import ApplicationDetails from './_components/application-details';
import ScreeningAnswers from './_components/screening-answers';
import AppicationHeader from './_components/application-header';
import ApplicationInterviewCard from './_components/application-interview-card';
import InterviewPrepCard from './_components/interview-prep-card';
import CheckrBackgroundCheckCard from './_components/checkr-background-check-card';
import { get_checkr_check_action } from "@/server/actions/checkr-actions";
import TwilioSmsCard from './_components/twilio-sms-card';
import { get_twilio_sms_state_action } from "@/server/actions/twilio-actions";
import DocuSignOfferLetterCard from './_components/docusign-offer-letter-card';
import { get_docusign_envelope_action } from "@/server/actions/docusign-actions";
import WhatsappMessageCard from './_components/whatsapp-message-card';
import { get_whatsapp_state_action } from "@/server/actions/whatsapp-actions";
import SterlingBackgroundCheckCard from './_components/sterling-background-check-card';
import { get_sterling_check_action } from "@/server/actions/sterling-actions";
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

    const stagesResponse = await get_job_listings_stages_action(applicationResult.job_id);
    const stages = Array.isArray(stagesResponse) ? stagesResponse : [];

    const jobResponse = await get_job_by_id_action(applicationResult.job_id);
    const job = (Array.isArray(jobResponse) ? jobResponse : [])[0];
    const rawResponse = await get_candidate_details(applicationResult.candidate_id);
    const candidateDetails = JSON.parse(rawResponse);

    // Checkr background-check state for the card. Guarded: if the
    // checkr_background_checks table doesn't exist yet (migration 0016
    // not run), the card is omitted instead of breaking the page.
    let checkrState: Awaited<ReturnType<typeof get_checkr_check_action>> | null = null;
    try {
        checkrState = await get_checkr_check_action(applicationResult.id);
    } catch (err) {
        console.error("[application] Failed to load Checkr state:", err);
    }

    // Twilio SMS state for the card. Guarded like Checkr: if the
    // sms_consents table doesn't exist yet (migration 0019 not run),
    // the card is omitted instead of breaking the page.
    let twilioState: Awaited<ReturnType<typeof get_twilio_sms_state_action>> | null = null;
    try {
        twilioState = await get_twilio_sms_state_action(applicationResult.id);
    } catch (err) {
        console.error("[application] Failed to load Twilio SMS state:", err);
    }
    // DocuSign offer-letter state for the card. Guarded: if the
    // docusign_envelopes table doesn't exist yet (migration 0020
    // not run), the card is omitted instead of breaking the page.
    let docusignState: Awaited<ReturnType<typeof get_docusign_envelope_action>> | null = null;
    try {
        docusignState = await get_docusign_envelope_action(applicationResult.id);
    } catch (err) {
        console.error("[application] Failed to load DocuSign state:", err);
    }
    // WhatsApp messaging state for the card. Guarded the same way: if
    // the whatsapp_consents / whatsapp_messages tables don't exist yet
    // (migration 0022 not run), the card is omitted instead of breaking
    // the page.
    let whatsappState: Awaited<ReturnType<typeof get_whatsapp_state_action>> | null = null;
    try {
        whatsappState = await get_whatsapp_state_action(applicationResult.id);
    } catch (err) {
        console.error("[application] Failed to load WhatsApp state:", err);
    }
    // Sterling background-check state for the card. Guarded: if the
    // sterling_background_checks table doesn't exist yet (migration 0023
    // not run), the card is omitted instead of breaking the page.
    let sterlingState: Awaited<ReturnType<typeof get_sterling_check_action>> | null = null;
    try {
        sterlingState = await get_sterling_check_action(applicationResult.id);
    } catch (err) {
        console.error("[application] Failed to load Sterling state:", err);
    }

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
                                        resume_score_fit={candidateDetails.resume_score_fit}
                                        jobSkills={
                                            job.job_technologies as unknown as JobExperienceType[]
                                        }
                                    />

                                    <ApplicationSoftSkills
                                        softSkills={candidateDetails.skills}
                                    />

                                    <ApplicationSummary
                                        candidate_id={applicationResult.candidate_id}
                                        resumeSummary={candidateDetails.resumeSummary}
                                        key_accomplishments={candidateDetails.key_accomplishments}
                                    />
                                    <ApplicationExperience experience={candidateDetails.experience} />
                                </div>
                            )}

                            {/* Right Column: Sidebar Info */}
                            <div className="space-y-4">
                                {/* Application Details */}
                                <ApplicationDetails applicationResult={applicationResult} />

                                {/* Screening Answers */}
                                <ScreeningAnswers applicationId={applicationResult.id} />

                                {/* Interview Status */}
                                <ApplicationInterviewCard applicationResult={applicationResult} />

                                {/* Claude Interview Prep (anthropic-screening plugin) */}
                                <InterviewPrepCard
                                    applicationId={applicationResult.id}
                                    currentStage={applicationResult.current_stage ?? null}
                                />

                                {/* Checkr Background Check */}
                                {checkrState && (
                                    <CheckrBackgroundCheckCard
                                        applicationId={applicationResult.id}
                                        currentStage={applicationResult.current_stage}
                                        candidateName={applicationResult.candidate_name}
                                        initialCheck={checkrState.check}
                                        pluginEnabled={checkrState.pluginEnabled}
                                        environment={checkrState.environment}
                                        defaultPackage={checkrState.defaultPackage}
                                    />
                                )}

                                {/* Twilio SMS */}
                                {twilioState && (
                                    <TwilioSmsCard
                                        applicationId={applicationResult.id}
                                        candidateName={twilioState.candidateName}
                                        candidatePhone={twilioState.candidatePhone}
                                        jobTitle={twilioState.jobTitle}
                                        initialConsent={twilioState.consent}
                                        pluginEnabled={twilioState.pluginEnabled}
                                        fromNumber={twilioState.fromNumber}
                                    />
                                )}
                                {/* DocuSign Offer Letter */}
                                {docusignState && (
                                    <DocuSignOfferLetterCard
                                        applicationId={applicationResult.id}
                                        currentStage={applicationResult.current_stage}
                                        candidateName={applicationResult.candidate_name}
                                        initialEnvelope={docusignState.envelope}
                                        pluginEnabled={docusignState.pluginEnabled}
                                        environment={docusignState.environment}
                                        defaultTemplateId={docusignState.defaultTemplateId}
                                        defaultRoleName={docusignState.defaultRoleName}
                                        defaultEmailSubject={docusignState.defaultEmailSubject}
                                    />
                                )}
                                {/* WhatsApp Business (Twilio) */}
                                {whatsappState && (
                                    <WhatsappMessageCard
                                        applicationId={applicationResult.id}
                                        candidateName={applicationResult.candidate_name}
                                        jobTitle={job?.job_name ?? null}
                                        initialConsent={whatsappState.consent}
                                        initialMessages={whatsappState.messages}
                                        pluginEnabled={whatsappState.pluginEnabled}
                                        fromNumber={whatsappState.fromNumber}
                                        defaultTemplateSid={whatsappState.defaultTemplateSid}
                                        candidatePhone={whatsappState.candidatePhone}
                                        candidatePhoneE164={whatsappState.candidatePhoneE164}
                                    />
                                )}
                                {/* Sterling Background Check */}
                                {sterlingState && (
                                    <SterlingBackgroundCheckCard
                                        applicationId={applicationResult.id}
                                        currentStage={applicationResult.current_stage}
                                        candidateName={applicationResult.candidate_name}
                                        initialCheck={sterlingState.check}
                                        pluginEnabled={sterlingState.pluginEnabled}
                                        environment={sterlingState.environment}
                                        defaultPackage={sterlingState.defaultPackage}
                                    />
                                )}

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
                                    candidate_id={applicationResult.candidate_id}
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
