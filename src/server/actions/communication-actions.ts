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
  createCommunicationLog,
  getCommunicationLogs,
} from "@/server/queries/mongo/communication-log";
import { sendEmail } from "@/lib/resend";

export type EmailTemplateDTO = {
  _id: string;
  templateId: string;
  name: string;
  subject: string;
  body: string;
  isDefault?: boolean;
  isSystem?: boolean;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
};

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

const SYSTEM_TEMPLATES: Omit<
  EmailTemplateDTO,
  "_id" | "organizationId" | "createdAt" | "updatedAt"
>[] = [
  {
    templateId: "interview_invite",
    name: "Interview Invitation",
    subject: "You're invited to interview for {{jobTitle}}",
    body: `Hi {{candidateName}},\n\nWe're excited to invite you to interview for the {{jobTitle}} role at {{companyName}}.\n\nPlease use the scheduling link we'll send separately to pick a time that works for you.\n\nBest regards,\n{{senderName}}\n{{companyName}} Talent Team`,
    isDefault: true,
    isSystem: true,
  },
  {
    templateId: "application_submitted",
    name: "Application Received",
    subject: "We received your application for {{jobTitle}}",
    body: `Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}} at {{companyName}}. We've received your application and our team will review it shortly.\n\nWe typically respond within 5–7 business days.\n\nBest,\nThe {{companyName}} Talent Team`,
    isDefault: true,
    isSystem: true,
  },
  {
    templateId: "application_rejected",
    name: "Application Update",
    subject: "Update on your application for {{jobTitle}}",
    body: `Hi {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} role at {{companyName}}. After careful review, we've decided to move forward with other candidates at this time.\n\nWe appreciate the time you invested and wish you the best in your search.\n\nBest regards,\n{{companyName}} Talent Team`,
    isDefault: true,
    isSystem: true,
  },
  {
    templateId: "information_request",
    name: "Information Request",
    subject: "Quick follow-up on your application",
    body: `Hi {{candidateName}},\n\nThanks again for applying to {{jobTitle}}. Could you please share a bit more detail about {{topic}}?\n\nReply to this email at your convenience.\n\nThanks,\n{{senderName}}`,
    isDefault: true,
    isSystem: true,
  },
  {
    templateId: "interview_reminder",
    name: "Interview Reminder",
    subject: "Reminder: Interview for {{jobTitle}} on {{interviewDate}}",
    body: `Hi {{candidateName}},\n\nThis is a friendly reminder about your upcoming interview for {{jobTitle}} on {{interviewDate}}.\n\nIf you need to reschedule, please reply as soon as possible.\n\nSee you soon,\n{{companyName}} Talent Team`,
    isDefault: true,
    isSystem: true,
  },
];

function applyPlaceholders(
  text: string,
  vars: Record<string, string | undefined>
) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function fetchCommunicationPageData() {
  const [templatesRaw, logs] = await Promise.all([
    getEmailTemplates(),
    getCommunicationLogs(50),
  ]);

  const templates: EmailTemplateDTO[] = JSON.parse(templatesRaw || "[]");

  return {
    templates,
    systemTemplates: SYSTEM_TEMPLATES,
    logs: logs as CommunicationLogDTO[],
  };
}

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

export async function sendManualEmailAction(input: {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  templateId?: string;
}) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error("Unauthorized");

  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!to || !subject || !body) {
    throw new Error("To, subject, and body are required");
  }

  // Prefer org-configured Resend key when available; fall back to env.
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
  } else {
    // Dev / no key: still log so the inbox works locally.
    status = "sent";
    resendId = `local_${createId()}`;
  }

  await createCommunicationLog({
    type: "manual",
    status,
    to,
    toName: input.toName,
    from: fromAddress,
    subject,
    body,
    templateId: input.templateId,
    resendId,
    error,
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

export { applyPlaceholders, SYSTEM_TEMPLATES };
