"use server";

import { db } from "@/drizzle/db";
import { candidates, usersTable } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import { sendEmail } from "@/lib/resend";
import CommunicationLog from "@/models/communication-log";
import Thread from "@/models/threads";
import { newCommunicationLog, newCommunicationThread } from "@/server/actions/communication-actions";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import { auth } from "@clerk/nextjs/server";
import { Types } from "mongoose";
import { and, eq } from "drizzle-orm";

const { ObjectId } = Types;

export async function get_communication_threads(limit = 50) {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) return [];

    const threads = await Thread.find({ organization_id: orgId })
        .populate("messages")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return JSON.parse(JSON.stringify(threads));
}

export const create_communication_thread = async (data: newCommunicationThread) => {
    await mongodb();
    const { orgId } = await auth();
    if (!orgId) return null;

    // Session org wins over anything in data — and the Thread model field is
    // organization_id (the old "organizationId" key was dropped by strict mode,
    // so these threads could never be found by org again).
    const thread = await Thread.create({
        ...data,
        organization_id: orgId,
    });

    return JSON.parse(JSON.stringify(thread));
};

export async function getCommunicationLogById(id: string) {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) return null;

    const log = await CommunicationLog.findOne({
        _id: id,
        organizationId: orgId,
    }).lean();

    if (!log) return null;
    return JSON.parse(JSON.stringify(log));
}

export async function create_communication_log(data: newCommunicationLog, orgId: string, userId: string) {
    await mongodb();

    const mode = data.mode ?? "reply";
    const text = data.body?.trim();

    if (!text) {
        return { error: "Message body is required" };
    }

    let thread;
    if (data.threadId) {
        if (!ObjectId.isValid(data.threadId)) {
            return { error: "Invalid thread id" };
        }

        thread = await Thread.findById(data.threadId);

        if (!thread) {
            return { error: "Thread not found" };
        }

        // Tenant isolation: make sure this thread actually belongs to the caller's org
        if (String(thread.organization_id) !== String(orgId)) {
            return { error: "Not authorized to access this thread" };
        }
    } else {
        if (!data.candidateEmail) {
            return { error: "candidateEmail is required to start a new thread" };
        }

        // Thread requires non-empty name/avatar/role/status plus last_message/last_timestamp.
        thread = await Thread.create({
            candidate_name: data.candidateName || "Unknown Candidate",
            candidate_email: data.candidateEmail,
            candidate_avatar: data.candidateAvatar || "default-avatar.png",
            candidate_role: data.candidateRole || "Candidate",
            candidate_status: data.candidateStatus || "ACTIVE",
            candidate_id: data.candidateId,
            organization_id: orgId,
            last_message: text,
            last_timestamp: new Date(),
            messages: [],
        });
    }

    // Get author name from database
    const author = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const authorName = author[0]?.name || "Unknown";
    const authorAvatar = author[0]?.image_url;

    const mentions = data.mentions ?? [];

    // Delivery outcome for reply mode — persisted on the log entry below.
    let status: "sent" | "failed" | "pending" = "pending";
    let resend_id: string | undefined;
    let deliveryError: string | undefined;

    if (mode === "reply") {
        // Recipient: explicit `to`, else the thread candidate's email
        // (verified to belong to this org).
        const to = data?.to?.trim() || (await resolve_thread_recipient(thread, orgId));
        const subject = data?.subject?.trim() || "Message from your hiring team";

        // Prefer the org-configured Resend key when available; fall back to env.
        const plugins = await db_get_organization_plugins(orgId);
        const resendSettings = plugins.settings?.["resend"];
        const apiKey = resendSettings?.credentials?.apiKey || process.env.RESEND_API_KEY;
        const fromAddress =
            (resendSettings?.config?.fromAddress as string | undefined) ||
            process.env.RESEND_FROM_EMAIL ||
            "recruiting@aplico.online";
        const companyName =
            (resendSettings?.config?.companyName as string | undefined) ||
            process.env.COMPANY_NAME ||
            "Talent Team";

        const html = text
            .split("\n")
            .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${line || "&nbsp;"}</p>`)
            .join("");

        if (apiKey) {
            if (!to) {
                status = "failed";
                deliveryError = "No recipient email for this thread";
            } else {
                try {
                    const { id } = await sendEmail({
                        apiKey,
                        from: `${companyName} <${fromAddress}>`,
                        to,
                        subject,
                        html,
                        tags: [
                            { name: "event", value: "manual_email" },
                            { name: "org", value: orgId },
                        ],
                    });
                    status = "sent";
                    resend_id = id;
                } catch (e) {
                    deliveryError = e instanceof Error ? e.message : String(e);
                    status = "failed";
                }
            }
        } else if (process.env.NODE_ENV === "production" && !apiKey) {
            status = "failed";
            deliveryError = "No Resend API key configured";
        } else {
            // DEV: no key configured — log the message as sent with a local id.
            status = "sent";
            resend_id = `local-${new Date().toISOString()}`;
        }
    }

    const message: {
        authorName: string;
        authorAvatar: string | null | undefined;
        text: string;
        sender: "recruiter" | "team";
        channel: "Email" | "Internal Note";
        organizationId: string;
        mentions: { userId: string; name: string }[];
        mentionedUserIds: string[];
        status?: "sent" | "failed" | "pending";
        resend_id?: string;
        error?: string;
    } = {
        authorName,
        authorAvatar,
        text: data.body.trim(),
        sender: mode === 'reply' ? 'recruiter' : 'team',
        channel: mode === 'reply' ? 'Email' : 'Internal Note',
        organizationId: orgId,
        mentions: mentions.length > 0 ? mentions : [],
        mentionedUserIds: mentions.map(m => m.userId) ?? [],
    };

    // Persist the delivery outcome on reply logs so the inbox reflects reality.
    if (mode === "reply") {
        message.status = status;
        if (resend_id) message.resend_id = resend_id;
        if (deliveryError) message.error = deliveryError;
    }

    const createdMessage = await CommunicationLog.create({ ...message });

    // Persist the message either way (email reply or internal note)
    const updateResult = await Thread.findOneAndUpdate(
        { _id: new ObjectId(thread._id) },
        {
            $push: { messages: createdMessage._id } as any,
            $set: {
                last_message: message.text,
                last_timestamp: createdMessage.createdAt,
                // A reply from the team clears the thread's unread state;
                // adjust if your unread logic differs.
                unread_count: 0,
            },
        },
        { returnDocument: "after" }
    );

    return { thread: updateResult.value };
}

/**
 * Resolve the reply recipient for a thread from its candidate — only when
 * the candidate belongs to the caller's org. Returns undefined when the
 * thread has no candidate or the candidate is not in this org.
 */
async function resolve_thread_recipient(thread: { candidate_id?: number }, orgId: string): Promise<string | undefined> {
    if (!thread.candidate_id) return undefined;

    const [candidate] = await db
        .select()
        .from(candidates)
        .where(and(eq(candidates.id, thread.candidate_id), eq(candidates.organization, orgId)))
        .limit(1);

    return candidate?.email;
}
