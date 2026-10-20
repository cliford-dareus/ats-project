import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { expire_and_release_stale_holds } from "@/server/holds/hold-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Expires stale Smart Interview Holds and releases their calendar slots.
 * Call every 5–15 min: `Authorization: Bearer $CRON_SECRET` (Vercel Cron compatible).
 * The BullMQ worker runs the same sweep on a schedule, so either is sufficient.
 */
async function handle(req: NextRequest) {
    if (!authorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await expire_and_release_stale_holds();
    return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
