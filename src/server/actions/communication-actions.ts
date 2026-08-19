"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import {
    deleteEmailTemplate,
    getEmailTemplates,
    saveEmailTemplate,
} from "@/server/queries/mongo/email-templates";
import {
    create_communication_log,
    get_communication_threads,
} from "@/server/queries/mongo/communication-log";
import { sendEmail } from "@/lib/resend";
import { CANDIDATE_STATUS } from "@/zod";
import { SYSTEM_TEMPLATES } from "@/lib/constant";
import { EmailTemplateDTO, ThreadItem } from "@/types";

export type CommunicationLogDTO = {
    _id: string;
    organizationId: string;
    type: string;
    status: string;
    to: string;
    toName?: string;
    from: string;
    subject: string;
    body: string;
    templateId?: string;
    resendId?: string;
    error?: string;
    sentBy?: string;
    createdAt: string;
    updatedAt?: string;
};

export type newCommunicationThread = {
    organization_id: string;
    candidate_id: number;
    candidate_name: string;
    candidate_avatar: string;
    candidate_role: string;
    last_message: string;
    unread_count: number;
    starred: boolean;
    messages: mongoose.Schema.Types.ObjectId[];
};

export type newCommunicationLog = {
    body: string;
    subject: string;
    to: string;
    toName?: string;
    candidateId?: number;
    candidateName?: string;
    candidateEmail?: string;
    candidateAvatar?: string;
    candidateRole?: string;
    candidateStatus?: typeof CANDIDATE_STATUS._type | null;
    templateId?: string;
};

function applyPlaceholders(text: string, vars: Record<string, string | undefined>) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function fetchCommunicationPageData() {
    const [templatesRaw, threads] = await Promise.all([
        getEmailTemplates(),
        get_communication_threads(50),
    ]);

    const templates: EmailTemplateDTO[] = JSON.parse(templatesRaw || "[]");

    return {
        templates,
        systemTemplates: SYSTEM_TEMPLATES,
        threads: threads as ThreadItem[],
    };
};

export const create_communication_thread = async (data: newCommunicationThread) => { };

// TEMPLATES
export async function upsertEmailTemplateAction(data: {
    id?: string;
    name: string;
    subject: string;
    body: string;
    templateId?: string;
}) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    if (!data.name.trim() || !data.subject.trim() || !data.body.trim()) {
        throw new Error("Name, subject, and body are required");
    }

    await saveEmailTemplate({
        id: data.id,
        name: data.name.trim(),
        subject: data.subject.trim(),
        body: data.body.trim(),
        templateId: data.templateId || `tpl_${createId()}`,
    });

    revalidatePath("/communication");
    return { success: true };
}

export async function deleteEmailTemplateAction(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await deleteEmailTemplate(id);
    revalidatePath("/communication");
    return { success: true };
}

export async function sendManualEmailAction(input: newCommunicationLog) {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");

    const to = input.to.trim();
    const subject = input.subject.trim();
    const body = input.body.trim();

    if (!to || !subject || !body) {
        throw new Error("To, subject, and body are required");
    }

    // Prefer org-configured Resend key when available; fall back to env.
    // e.g. const apiKey = (await getOrgResendKey(orgId)) || process.env.RESEND_API_KEY;
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
        process.env.RESEND_FROM_EMAIL || "recruiting@aplico.online";
    const companyName = process.env.COMPANY_NAME || "Talent Team";

    const html = body
        .split("\n")
        .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${line || "&nbsp;"}</p>`)
        .join("");

    let resendId: string | undefined;
    let status: "sent" | "failed" = "sent";
    let error: string | undefined;

    if (apiKey) {
        try {
            const result = await sendEmail({
                apiKey,
                from: `${companyName} <${fromAddress}>`,
                to,
                subject,
                html: `<div style="font-family:system-ui,sans-serif;color:#18181b;max-width:560px">${html}</div>`,
                tags: [
                    { name: "event", value: "manual" },
                    { name: "org", value: orgId },
                ],
            });
            resendId = result.id;
        } catch (e) {
            status = "failed";
            error = e instanceof Error ? e.message : "Failed to send email";
        }
    } else if (process.env.NODE_ENV === "production") {
        // No key configured in production.
        status = "failed";
        error = "Email service not configured";
    } else {
        // Dev / no key: still log so the inbox works locally.
        status = "sent";
        resendId = `local_${createId()}`;
    }

    await create_communication_log({
        ...input,
        text: body,
        status,
        resendId,
        channel: 'Email'
    });

    revalidatePath("/communication");

    if (status === "failed") {
        throw new Error(error || "Failed to send email");
    }

    return { success: true, resendId };
}

export async function seedSystemTemplatesAction() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const existingRaw = await getEmailTemplates();
    const existing: EmailTemplateDTO[] = JSON.parse(existingRaw || "[]");
    const existingIds = new Set(existing.map((t) => t.templateId));

    for (const tpl of SYSTEM_TEMPLATES) {
        if (existingIds.has(tpl.templateId)) continue;
        await saveEmailTemplate({
            name: tpl.name,
            subject: tpl.subject,
            body: tpl.body,
            templateId: tpl.templateId,
        });
    }

    revalidatePath("/communication");
    return { success: true };
}
