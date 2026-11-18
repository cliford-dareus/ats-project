import type { ComponentType } from "react";
import InterviewInvitationTemplate from "@/emails/interview_invite_template";
import ApplicationConfirmationTemplate from "@/emails/application_submitted_template";
import ApplicationRejectionTemplate from "@/emails/application_rejected_template";
import InformationRequestTemplate from "@/emails/infomation_request_template";
import InterviewReminder from "@/emails/inteview_reminder_template";
import VercelInviteUserEmail from "@/emails/organization_invite_template";
import InterviewHoldTemplate from "@/emails/interview_hold_template";

// Maps a stored templateId (see SYSTEM_TEMPLATES in @/lib/constant) to the
// React Email component that renders it. Used by the smart-trigger worker
// when it sends a templated email; returns null for unknown ids.
// The templates take different props, so the registry stores them as
// ComponentType<never> (any component is assignable to it); the caller
// passes props through React.createElement, which accepts any props.
const TEMPLATE_COMPONENTS: Record<string, ComponentType<never>> = {
    interview_invite: InterviewInvitationTemplate,
    application_submitted: ApplicationConfirmationTemplate,
    application_rejected: ApplicationRejectionTemplate,
    information_request: InformationRequestTemplate,
    interview_reminder: InterviewReminder,
    organization_invite: VercelInviteUserEmail,
    interview_hold: InterviewHoldTemplate,
};

export const getTemplateById = (
    templateId: string
): { component: ComponentType<never> } | null => {
    const component = TEMPLATE_COMPONENTS[templateId];
    return component ? { component } : null;
};
