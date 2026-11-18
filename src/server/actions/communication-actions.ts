"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import {
    deleteEmailTemplate,
    ensure_default_templates,
    getEmailTemplates,
    saveEmailTemplate,
} from "@/server/queries/mongo/email-templates";
import {
    create_communication_log,
    create_communication_thread as create_communication_thread_query,
    get_communication_threads,
} from "@/server/queries/mongo/communication-log";
import { CANDIDATE_STATUS } from "@/zod";
import { SYSTEM_TEMPLATES } from "@/lib/constant";
import { EmailTemplateDTO, ThreadItem } from "@/types";
import { requirePermission } from "@/server/permissions";
import type { Types } from "mongoose";

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
    messages: Types.ObjectId[];
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
    // Optional: compose flows send without mentions; defaults to [] server-side.
    mentions?: { userId: string; name: string }[];
};


export async function fetchCommunicationPageData() {
    await requirePermission("communication:view");
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

export const create_communication_thread = async (data: Omit<newCommunicationThread, "organization_id">) => {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // Session org wins — the caller never supplies the organization.
    return create_communication_thread_query({ ...data, organization_id: orgId });
};

export async function sendManualEmailAction(input: newCommunicationLog) {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");
    await requirePermission("communication:send");

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
        mentions: input.mentions ?? [],
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
    await requirePermission("communication:manage");

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
    await requirePermission("communication:manage");

    await deleteEmailTemplate(id);
    revalidatePath("/communication");
    return { success: true };
}

export async function seedSystemTemplatesAction() {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");
    await requirePermission("communication:manage");

    // Idempotent upserts — only templates the org lacks are inserted.
    // (Templates are also lazily seeded on first read; this is the manual re-seed.)
    await ensure_default_templates(orgId);

    revalidatePath("/communication");
    return { success: true };
}
