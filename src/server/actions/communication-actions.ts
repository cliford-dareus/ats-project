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
    to?: string;
    body: string;
    subject: string;
    toName?: string;
    mode?: 'reply' | 'internal';
    threadId?: string;
    candidateId?: number;
    candidateName?: string;
    candidateEmail?: string;
    candidateAvatar?: string;
    candidateRole?: string;
    candidateStatus?: typeof CANDIDATE_STATUS._type | null;
    templateId?: string;
    mentions: { userId: string; name: string }[];
};


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

export async function sendManualEmailAction(input: newCommunicationLog) {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");

    const payload = {
        to: input.to,
        subject: input.subject,
        body: input.body,
        mode: input.mode,
        threadId: input.threadId,
        candidateId: input.candidateId,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidateAvatar: input.candidateAvatar,
        candidateRole: input.candidateRole,
        candidateStatus: input.candidateStatus,
        mentions: input.mentions,
    };

    const result = await create_communication_log(payload, orgId, userId);

    revalidatePath("/communication");

    if (result.error) {
        throw new Error(result.error);
    }

    return { success: true, thread: result.thread };
}


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
