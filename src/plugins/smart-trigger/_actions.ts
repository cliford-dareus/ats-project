import { applications, candidates, stages } from "@/drizzle/schema";
import { ConfigType } from "./types";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import Trigger from "@/models/trigger";
import { JOB_STAGES } from "@/zod";
import { z } from "zod";
import { sendEmail } from "@/lib/resend";
import { render } from "@react-email/components";
import React from "react";
import mongodb from "@/lib/mongodb";
import EmailTemplate from "@/models/email-templates";
import { getTemplateById } from "@/lib/templates";

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
        case 'NOTE':
            await executeSmartNoteAction(jobData);
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

    const [candidate] = await db.select()
        .from(candidates)
        .where(eq(candidates.id, application.candidate))
        .limit(1);
    if (!candidate) throw new Error(`Candidate ${application_id} not found`);

    // Handle location conditions
    if (config?.condition?.type === 'location' && config?.condition?.location && config.condition.target) {
        const [targetStage] = await db.select()
            .from(stages)
            .where(and(
                eq(stages.job_id, application.job_id!),
                eq(stages.stage_name, config.condition.target)
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
    await mongodb();
    const { application_id: candidateId, trigger_id, config } = jobData;

    const [application] = await db.select()
        .from(applications)
        .where(eq(applications.id, candidateId))
        .limit(1);
    if (!application) throw new Error(`Application ${candidateId} not found`);

    // Fetch candidate details (to get the email address)
    const [candidate] = await db.select()
        .from(candidates)
        .where(eq(candidates.id, application.candidate!))
        .limit(1);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const { email } = candidate;

    const savedProps = await EmailTemplate.findOne({ _id: config?.email?.template });
    if (!savedProps) return new Response('Not Found', { status: 404 });

    const template = getTemplateById(savedProps.templateId || '');
    if (!template) return new Response('Not Found', { status: 404 });

    // Convert React component to HTML string
    const html = await render(React.createElement(template?.component, savedProps || {}));

    // Send email
    const result = await sendEmail({
        to: email,
        subject: config?.email?.subject as string,
        html,
        from: config?.email?.from,
    });
    if (!result) throw new Error(`Failed to send email to ${email}`);
};

export const executeSmartNoteAction = async (jobData: SmartTriggerJobData) => {
    await mongodb();
    const { application_id: candidateId, trigger_id, config } = jobData;

    const noteContent = config?.note?.content as string;
    if (!noteContent) return;

    const [application] = await db.select()
        .from(applications)
        .where(eq(applications.id, candidateId))
        .limit(1);
    if (!application) throw new Error(`Application ${candidateId} not found`);

    await db.insert(notes)
        .values({
            content: noteContent,
            application_id: candidateId,
            trigger_id,
        });
}