import { applications, candidates, stages } from "@/drizzle/schema";
import { ConfigType } from "./types";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import Trigger from "@/models/trigger";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import { sendEmail } from "@/lib/resend";
import ApplicationSubmittedTemplate from "@/emails/application_submitted_template";
import React from "react";

interface SmartTriggerJobData {
    application_id: number;
    new_stage_name: z.infer<typeof JOB_STAGES>;
    trigger_id: string;
    jobId: number;
    type: string;
    config: ConfigType;
    props: any;
};

export const executeSmartTriggerAction = async (jobData: SmartTriggerJobData) => {
    const { type } = jobData;
    switch (type) {
        case 'MOVE':
            await executeSmartMoveAction(jobData);
            break;
        case 'EMAIL':
            await executeSmartEmailAction(jobData);
            break;
        default:
    }
};

export const executeSmartMoveAction = async (jobData: SmartTriggerJobData) => {
    const { application_id, new_stage_name, trigger_id, config } = jobData;

    // Fetch application and verify existence
    const [application] = await db.select()
        .from(applications)
        .where(eq(applications.id, application_id))
        .limit(1);
    if (!application) throw new Error(`Application ${application_id} not found`);

    // Handle location conditions
    if (config?.condition?.type === 'location' && config?.condition?.location) {
        const [targetStage] = await db.select()
            .from(stages)
            .where(and(
                eq(stages.job_id, application.job_id!),
                eq(stages.stage_name, new_stage_name)
            ))
            .limit(1);
        if (!targetStage) throw new Error(`Target stage ${new_stage_name} not found for this job`);

        await db.update(applications)
            .set({ current_stage_id: targetStage.id })
            .where(eq(applications.id, application_id));
    }

    if (trigger_id) {
        await Trigger.findByIdAndDelete(trigger_id);
    }
};

export const executeSmartEmailAction = async (jobData: SmartTriggerJobData) => {
    const { application_id: candidateId, trigger_id, config, props } = jobData;

    // 1. Fetch candidate details (to get the email address)
    const [candidate] = await db.select()
        .from(candidates)
        .where(eq(candidates.id, candidateId))
        .limit(1);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const { email } = candidate;

    // 1. Get email template
    const template = await getEmailTemplate(config?.email?.template as string, props);

    // 2. Send email
    const result = await sendEmail({ to: email, subject: config?.email?.subject as string, template, from: config?.email?.from });
    if (!result) throw new Error(`Failed to send email to ${email}`);
};

const getEmailTemplate = async (type: string, props: any): Promise<React.ReactElement> => {
    switch (type) {
        case 'application-submitted':
            return React.createElement(ApplicationSubmittedTemplate, { ...props });
        case '':
            return
        default:
            throw new Error(`Unknown email template type: ${type}`);
    }
};
