"use server";

import mongodb from "@/lib/mongodb";
import CommunicationLog from "@/models/communication-log";
import { auth } from "@clerk/nextjs/server";

export async function getCommunicationLogs(limit = 50) {
  await mongodb();

  const { orgId } = await auth();
  if (!orgId) return [];

  const logs = await CommunicationLog.find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(logs));
}

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

export async function createCommunicationLog(data: {
  type?: string;
  status?: string;
  to: string;
  toName?: string;
  from: string;
  subject: string;
  body: string;
  templateId?: string;
  candidateId?: number;
  applicationId?: number;
  jobId?: number;
  resendId?: string;
  error?: string;
}) {
  await mongodb();

  const { orgId, userId } = await auth();
  if (!orgId || !userId) throw new Error("Unauthorized");

  const log = await CommunicationLog.create({
    organizationId: orgId,
    sentBy: userId,
    type: data.type ?? "manual",
    status: data.status ?? "sent",
    to: data.to,
    toName: data.toName,
    from: data.from,
    subject: data.subject,
    body: data.body,
    templateId: data.templateId,
    candidateId: data.candidateId,
    applicationId: data.applicationId,
    jobId: data.jobId,
    resendId: data.resendId,
    error: data.error,
  });

  return JSON.parse(JSON.stringify(log));
}
