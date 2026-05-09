import ApplicationRejectionTemplate from "@/emails/application_rejected_template";
import InformationRequestTemplate from "@/emails/infomation_request_template";
import InterviewInvitationTemplate from "@/emails/interview_invite_template";

export const EMAIL_TEMPLATES = [
    {
        id: 'interview-invite',
        name: 'Interview Invitation',
        category: 'Scheduling',
        component: InterviewInvitationTemplate,
        defaultProps: {
            candidateName: 'Candidate',
            jobTitle: 'Software Engineer',
            interviewerNames: 'Interviewer 1',
            schedulingLink: 'https://calendly.com/...',
            subject: 'Interview Invitation',
            body: '',
        }
    },
    {
        id: 'application-rejection',
        name: 'Application Rejection',
        category: 'Rejection',
        component: ApplicationRejectionTemplate,
        defaultProps: {
            candidateName: 'Candidate',
            jobTitle: 'Software Engineer',
            subject: 'Application Rejection',
            body: 'Thank you for the time you spent interviewing with our Engineering team...',
            stage: "application",
        }
    },
    {
        id: 'information-request',
        name: 'Information Request',
        category: 'Information',
        component: InformationRequestTemplate,
        defaultProps: {
            candidateName: 'Candidate',
            jobTitle: 'Software Engineer',
            subject: 'Request for more Information',
            body: '',
        }
    },
    // {
    //   id: 'offer-letter',
    //   name: 'Official Offer',
    //   category: 'Hiring',
    //   component: OfferLetterTemplate,
    //   defaultProps: {
    //     name: 'Candidate',
    //     jobTitle: 'Software Engineer',
    //     startDate: 'Monday, Oct 1st'
    //   }
    // }
];

export type TemplateId = typeof EMAIL_TEMPLATES[number]['id'];

export const getTemplateById = (id: string) => EMAIL_TEMPLATES.find(t => t.id === id);
