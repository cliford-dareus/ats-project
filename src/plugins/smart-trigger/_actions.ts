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
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";

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

    // candidate is a nullable FK — a candidate-less application has no one
    // to evaluate the location condition against.
    if (!application.candidate) throw new Error(`Application ${application_id} has no candidate`);

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

    // Send email — a sender address is required; without one Resend would
    // reject the send, so fail here with a clear error instead.
    const from = config?.email?.from;
    if (!from) throw new Error(`Smart trigger email for application ${candidateId} has no sender address`);

    // Prefer the org-configured Resend key (decrypted, server-only), falling
    // back to the env key — same as manual email sends.
    const plugins = await db_get_organization_plugins(application.organization);
    const apiKey = plugins.settings?.["resend"]?.credentials?.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error(`Smart trigger email for application ${candidateId} has no Resend API key configured`);

    const result = await sendEmail({
        apiKey,
        to: email,
        subject: config?.email?.subject as string,
        html,
        from,
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

    // await db.insert(notes)
    //     .values({
    //         content: noteContent,
    //         application_id: candidateId,
    //         trigger_id,
    //     });
}
