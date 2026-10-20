// Server/worker-only org mailer. Deliberately NOT "use server".
//
//  - Resolves Resend credentials for an org (org plugin key → platform RESEND_API_KEY)
//  - Renders org templates ({{placeholders}}) with system-template fallback
//  - Sends via Resend and logs every outbound email to CommunicationLog (+ candidate Thread)

import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { organization } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import { sendEmail } from "@/lib/resend";
import { SYSTEM_TEMPLATES } from "@/lib/constant";
import CommunicationLog, { CommunicationType } from "@/models/communication-log";
import EmailTemplate from "@/models/email-templates";
import Thread from "@/models/threads";
import { db_get_org_plugin_state } from "@/server/queries/drizzle/plugin-queries";

export type TemplateVars = Record<string, string | number | null | undefined>;

export function fill_template(text: string, vars: TemplateVars): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
        const value = vars[key];
        return value === undefined || value === null ? match : String(value);
    });
}

function escape_html(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Plain text → safe HTML. All content is escaped; bare URLs become links. */
export function text_to_html(text: string): string {
    const body = text
        .split("\n")
        .map((line) => {
            const safe = escape_html(line).replace(
                /(https?:\/\/[^\s<]+)/g,
                (url) => `<a href="${url}" style="color:#4f46e5">${url}</a>`
            );
            return `<p style="margin:0 0 12px;line-height:1.6">${safe || "&nbsp;"}</p>`;
        })
        .join("");
    return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;color:#18181b">${body}</div>`;
}

export async function get_org_profile(orgId: string) {
    const [org] = await db
        .select({ name: organization.name, email: organization.email, subdomain: organization.subdomain })
        .from(organization)
        .where(eq(organization.clerk_id, orgId))
        .limit(1);
    return org ?? null;
}

/** Org template by templateId, falling back to the built-in system template. */
export async function render_org_template(orgId: string, templateId: string, vars: TemplateVars) {
    await mongodb();
    const custom = await EmailTemplate.findOne({ organizationId: orgId, templateId }).lean<{
        subject: string;
        body: string;
    }>();
    const system = SYSTEM_TEMPLATES.find((t) => t.templateId === templateId);
    const source = custom ?? system;
    if (!source) throw new Error(`Unknown email template: ${templateId}`);

    return {
        templateId,
        subject: fill_template(source.subject, vars),
        text: fill_template(source.body, vars),
    };
}

async function resolve_resend(orgId: string) {
    let apiKey = process.env.RESEND_API_KEY ?? "";
    let fromAddress = process.env.RESEND_FROM_EMAIL ?? "";

    try {
        const { installed } = await db_get_org_plugin_state(orgId);
        const resend = installed.find((p) => p.id === "resend");
        if (resend?.settings.credentials?.apiKey) apiKey = resend.settings.credentials.apiKey;
        const configured = resend?.settings.config?.fromAddress;
        if (typeof configured === "string" && configured.includes("@")) fromAddress = configured;
    } catch (err) {
        console.warn("[org-mailer] could not load org plugin state", (err as Error).message);
    }

    return { apiKey, fromAddress: fromAddress || "onboarding@resend.dev" };
}

export type SendOrgEmailInput = {
    orgId: string;
    to: string;
    toName?: string;
    subject: string;
    /** Plain-text body; converted to escaped HTML unless `html` is supplied. */
    text: string;
    html?: string;
    type: CommunicationType;
    candidateId?: number;
    templateId?: string;
    /** Clerk user id of the sender, or undefined for system mail. */
    sentBy?: string;
    authorName?: string;
    authorAvatar?: string | null;
};

export type SendOrgEmailResult = {
    success: boolean;
    resendId?: string;
    error?: string;
    logId?: string;
    threadId?: string;
};

export async function send_org_email(input: SendOrgEmailInput): Promise<SendOrgEmailResult> {
    await mongodb();

    const org = await get_org_profile(input.orgId);
    const companyName = org?.name ?? "Talent Team";
    const { apiKey, fromAddress } = await resolve_resend(input.orgId);

    let status: "sent" | "failed" = "sent";
    let resendId: string | undefined;
    let error: string | undefined;

    if (apiKey) {
        try {
            const res = await sendEmail({
                apiKey,
                from: `${companyName} <${fromAddress}>`,
                to: input.to,
                subject: input.subject,
                html: input.html ?? text_to_html(input.text),
                replyTo: org?.email && org.email !== "company@example.com" ? org.email : undefined,
                tags: [
                    { name: "type", value: input.type },
                    { name: "org", value: input.orgId.replace(/[^a-zA-Z0-9_-]/g, "_") },
                ],
            });
            resendId = res.id;
        } catch (e) {
            status = "failed";
            error = e instanceof Error ? e.message : String(e);
        }
    } else if (process.env.NODE_ENV === "production") {
        status = "failed";
        error = "No Resend API key configured";
    } else {
        // Local dev without a key: log the mail so flows are testable end-to-end.
        resendId = `local-${Date.now()}`;
        console.info(`[org-mailer] (dev) ${input.type} → ${input.to}: ${input.subject}`);
    }

    const log = await CommunicationLog.create({
        organizationId: input.orgId,
        sender: input.sentBy ? "recruiter" : "system",
        authorName: input.authorName ?? (input.sentBy ? "Recruiter" : companyName),
        authorAvatar: input.authorAvatar ?? undefined,
        text: input.text,
        channel: "Email",
        type: input.type,
        status,
        to: input.to,
        subject: input.subject,
        candidateId: input.candidateId,
        templateId: input.templateId,
        resendId,
        sentBy: input.sentBy,
        error,
        mentions: [],
        mentionedUserIds: [],
    });

    let threadId: string | undefined;
    if (input.candidateId) {
        const thread = await Thread.findOneAndUpdate(
            { organization_id: input.orgId, candidate_id: input.candidateId },
            {
                $push: { messages: log._id },
                $set: { last_message: input.subject, last_timestamp: new Date() },
                $setOnInsert: {
                    candidate_name: input.toName ?? "",
                    candidate_email: input.to,
                },
            },
            { upsert: true, new: true }
        );
        threadId = thread?._id ? String(thread._id) : undefined;
    }

    return { success: status === "sent", resendId, error, logId: String(log._id), threadId };
}
