import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { attachments, candidates } from "@/drizzle/schema";
import { stream_r2_object } from "@/lib/r2-download";
import { hasPermission } from "@/server/permissions";

/**
 * Download one attachment. The attachment must belong to a candidate in
 * the caller's org (attachments carry no org column — scope through the
 * candidate). The R2 key comes from the database, never from the request.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ attachmentId: string }> },
) {
    const { attachmentId } = await params;
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("candidate:view"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = Number(attachmentId);
    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }

    const [row] = await db
        .select({
            file_name: attachments.file_name,
            file_url: attachments.file_url,
        })
        .from(attachments)
        .innerJoin(candidates, eq(candidates.id, attachments.candidate_id))
        .where(and(eq(attachments.id, id), eq(candidates.organization, orgId)))
        .limit(1);

    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return stream_r2_object(row.file_url, row.file_name);
}
