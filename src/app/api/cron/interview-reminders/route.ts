import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { send_interview_reminders } from "@/server/interviews/reminder-service";

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
 * Sends 24h interview reminders (candidate + interviewers) for interviews
 * starting in the next 24h that haven't been reminded yet.
 * Call every 5–15 min: `Authorization: Bearer $CRON_SECRET` (Vercel Cron compatible).
 * The BullMQ worker runs the same sweep on a schedule, so either is sufficient.
 */
async function handle(req: NextRequest) {
    if (!authorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await send_interview_reminders();
    return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
