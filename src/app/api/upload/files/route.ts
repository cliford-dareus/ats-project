import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { uploadResumeToR2 } from "@/lib/upload-file-to-r2";
import { ALLOWED_RESUME_MIME, MAX_RESUME_BYTES } from "@/lib/resume-validation";
import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import { canEditCandidate } from "@/server/permissions";
import mongodb from "@/lib/mongodb";
import Attachment from "@/models/attachments";

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "RESUME",
  "COVER_LETTER",
  "OFFER_LETTER",
  "OTHER",
]);

export async function POST(req: Request) {
  try {
    // Tenant + auth from session only — never trust client orgId
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Uploading an attachment mutates candidate data
    if (!(await canEditCandidate())) {
      return NextResponse.json(
        { error: "You do not have permission to upload attachments" },
        { status: 403 }
      );
    }

    await mongodb();

    const formData = await req.formData();
    const file = formData.get("my-file") as File | null;
    const candidateIdRaw = formData.get("candidate_id") as string | null;
    const attachmentType = (formData.get("attachment_type") as string | null)?.toUpperCase();

    if (!candidateIdRaw || !attachmentType || !file) {
      return NextResponse.json(
        { error: "candidate_id, attachment_type, and file are required" },
        { status: 400 }
      );
    }

    const candidateId = Number(candidateIdRaw);
    if (!Number.isFinite(candidateId) || candidateId <= 0) {
      return NextResponse.json({ error: "Invalid candidate_id" }, { status: 400 });
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(attachmentType)) {
      return NextResponse.json({ error: "Invalid attachment_type" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
      return NextResponse.json(
        { error: "File must be between 1 byte and 10 MB" },
        { status: 400 }
      );
    }

    // MIME type is required and must be allowlisted — an empty file.type
    // previously skipped this check entirely.
    if (!file.type || !ALLOWED_RESUME_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Candidate must belong to the caller's organization
    const [candidate] = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        organization: candidates.organization,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organization, orgId),
          isNull(candidates.deleted_at)
        )
      )
      .limit(1);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const fileUrl = await uploadResumeToR2(file, candidate.name, {
      orgId,
      candidateId,
    });

    await Attachment.create({
      file_name: file.name.slice(0, 255),
      file_url: fileUrl,
      candidate_id: candidateId,
      attachment_type: attachmentType,
      organization_id: orgId,
    });

    return NextResponse.json({ success: true, file_url: fileUrl });
  } catch (e) {
    console.error("[upload/files]", e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
