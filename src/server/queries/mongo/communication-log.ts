"use server";

import { db } from "@/drizzle/db";
import { usersTable } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import CommunicationLog from "@/models/communication-log";
import Thread from "@/models/threads";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

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

export async function create_communication_log(data) {
    await mongodb();

    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");

    // check if the candidate alreagy has a thread with the organization
    const existingThread = await Thread.findOne({
        organization: orgId,
        candidate_id: data.candidate_id,
    });

    const author = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.organization, orgId)));

    const createdLog = await CommunicationLog.create({
        organizationId: orgId,
        sender: userId,
        authorName: author[0]?.name,
        authorAvatar: author[0]?.avatar ?? "",
        ...data,
    });

    let thread;
    if (existingThread) {
        thread = await Thread.findByIdAndUpdate(
            existingThread._id,
            {
                $push: { messages: createdLog._id },
                $inc: { unread_count: 1 },
                $set: { last_message: data.body, last_message_at: new Date() },
            },
            { new: true },
        );
    } else {
        thread = await Thread.create({
            organization_id: orgId,
            candidate_id: data.candidateId,
            candidate_name: data.candidateName,
            candidate_avatar: data.candidateAvatar,
            candidate_role: data.candidateRole,
            candidate_status: data.candidateStatus,
            last_message: data.body,
            last_message_at: new Date(),
            unread_count: 1,
            messages: [createdLog._id],
        });
    }

    return { log: createdLog, thread };
}
