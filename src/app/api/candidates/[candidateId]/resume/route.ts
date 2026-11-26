import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { candidates } from "@/drizzle/schema";
import { stream_r2_object } from "@/lib/r2-download";
import { hasPermission } from "@/server/permissions";

/**
 * Download (or inline-view) a candidate's resume. The resume key comes
 * from the candidate row, which must belong to the caller's org. Legacy
 * `no-resume-...` placeholder keys and empty paths are 404s, not files.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ candidateId: string }> },
) {
    const { candidateId } = await params;
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission("candidate:view"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = Number(candidateId);
    if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
    }

    const [candidate] = await db
        .select({ cv_path: candidates.cv_path, name: candidates.name })
        .from(candidates)
        .where(and(eq(candidates.id, id), eq(candidates.organization, orgId)))
        .limit(1);

    if (!candidate || !candidate.cv_path || candidate.cv_path.startsWith("no-resume-")) {
        return NextResponse.json({ error: "No resume uploaded" }, { status: 404 });
    }

    const key = candidate.cv_path;
    const extension = key.split(".").pop()?.toLowerCase() ?? "pdf";
    const fileName = `${candidate.name.replace(/[^A-Za-z0-9]+/g, "-")}-Resume.${extension}`;
    // `?view=1` serves the file inline so the review page's PDF viewer can
    // embed it; the default is a download.
    const inline = new URL(req.url).searchParams.get("view") === "1";
    return stream_r2_object(key, fileName, inline);
}
