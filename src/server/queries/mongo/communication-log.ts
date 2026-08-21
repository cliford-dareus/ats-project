"use server";

import { db } from "@/drizzle/db";
import { usersTable } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import CommunicationLog from "@/models/communication-log";
import Thread from "@/models/threads";
import { newCommunicationLog } from "@/server/actions/communication-actions";
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

export const create_communication_thread = async (data) => {
    await mongodb();
    const { orgId } = await auth();
    if (!orgId) return null;

    const thread = await Thread.create({
        organizationId: orgId,
        ...data,
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

        thread = await Thread.create({
            candidate_name: data.candidateName ?? "",
            candidate_email: data.candidateEmail,
            candidate_avatar: data.candidateAvatar ?? "",
            candidate_role: data.candidateRole ?? "",
            candidate_status: data.candidateStatus ?? "",
            candidate_id: data.candidateId,
            organization_id: orgId,
            messages: [],
        });
    }

    // Get author name from database
    const author = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const authorName = author[0]?.name || "Unknown";
    const authorAvatar = author[0]?.image_url;

    const message: Record<string, any> = {
        authorName,
        authorAvatar,
        text: data.body.trim(),
        sender: mode === 'reply' ? 'recruiter' : 'team',
        channel: mode === 'reply' ? 'Email' : 'Internal Note',
        organizationId: orgId,
        mentions: data.mentions.length > 0 ? data.mentions : [],
        mentionedUserIds: data.mentions.map(m => m.userId) ?? [],
    };

    if (mode === "reply") {
        const to = data?.to?.trim();
        const subject = data?.subject?.trim();

        // Prefer org-configured Resend key when available; fall back to env.
        // e.g. const apiKey = (await getOrgResendKey(orgId)) || process.env.RESEND_API_KEY;
        const apiKey = null;
        const fromAddress = process.env.RESEND_FROM_EMAIL || "recruiting@aplico.online";
        const companyName = process.env.COMPANY_NAME || "Talent Team";

        const html = text
            .split("\n")
            .map((line) => `<p style="margin:0 0 12px;line-height:1.6">${line || "&nbsp;"}</p>`)
            .join("");

        let resend_id: string | undefined;
        let status: "sent" | "failed" | "pending";
        let error: string | undefined;

        if (apiKey) {
            try {
                // resend email
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
                status = "failed";
            }
        } else if (process.env.NODE_ENV === "production" && !apiKey) {
            status = "failed";
            error = "No Resend API key configured";
        } else {
            // DEV: use local timestamp as resend_id for development
            status = "sent";
            resend_id = `local-${new Date().toISOString()}`;
        }
    }

    const createdMessage = await CommunicationLog.create({ ...message });

    // Persist the message either way (email reply or internal note)
    const updateResult = await Thread.findOneAndUpdate(
        { _id: new ObjectId(thread._id) },
        {
            $push: { messages: createdMessage._id } as any,
            $set: {
                last_message: message.text,
                last_timestamp: message.createdAt,
                // A reply from the team clears the thread's unread state;
                // adjust if your unread logic differs.
                unread_count: 0,
            },
        },
        { returnDocument: "after" }
    );

    return { thread: updateResult.value };
}
