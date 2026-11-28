// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/calendly — Calendly webhook receiver (public route).
//
// Security:
//   • The org is NEVER taken from the request — it is resolved from the
//     interview row matched by the payload's event URI.
//   • The signature is verified BEFORE any mutation: header
//     `Calendly-Webhook-Signature: t=<unix ts>,v1=<hex HMAC-SHA256>`,
//     HMAC-SHA256 over "<t>.<raw request body>" keyed with the stored
//     (encrypted) webhook signing key. Constant-time compare; timestamps
//     older than 180s are rejected.
//   • `invitee.canceled` cancels the matching interview (DB cancel only —
//     no Google touch: Calendly rows have no Google event). `invitee.created`
//     is acknowledged and ignored: API bookings have no pending state to
//     confirm, so nothing is invented for it.
//   • Unknown events / unknown event URIs still return 2xx after
//     verification (Calendly retries non-2xx); only a bad signature or a
//     malformed body returns 4xx.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCalendlyPatForOrg } from "@/server/calendly";
import {
    cancel_interview_db,
    get_interview_by_calendly_event_uri,
} from "@/server/queries/drizzle/interview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIGNATURE_AGE_SECONDS = 180;

type CalendlyWebhookPayload = {
    event?: string;
    payload?: {
        event?: string | { uri?: string };
        invitee?: { uri?: string; email?: string };
        event_type?: string;
        cancellation?: { reason?: string };
    };
};

function parse_signature_header(
    header: string | null
): { t: string; v1: string } | null {
    if (!header) return null;
    const parts = Object.fromEntries(
        header.split(",").map((pair) => {
            const [key, ...rest] = pair.split("=");
            return [key?.trim(), rest.join("=")?.trim()];
        })
    );
    if (!parts.t || !parts.v1) return null;
    return { t: parts.t, v1: parts.v1 };
}

function verify_calendly_signature(
    rawBody: string,
    signatureHeader: string | null,
    signingKey: string
): boolean {
    const parsed = parse_signature_header(signatureHeader);
    if (!parsed) return false;
    const timestamp = Number(parsed.t);
    if (!Number.isFinite(timestamp)) return false;
    if (Math.abs(Date.now() / 1000 - timestamp) > MAX_SIGNATURE_AGE_SECONDS) {
        return false;
    }
    const expected = createHmac("sha256", signingKey)
        .update(`${parsed.t}.${rawBody}`)
        .digest("hex");
    const a = Buffer.from(parsed.v1, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();

    let body: CalendlyWebhookPayload;
    try {
        body = JSON.parse(rawBody) as CalendlyWebhookPayload;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = body.event ?? "";
    const payloadEvent = body.payload?.event;
    const eventUri =
        typeof payloadEvent === "string"
            ? payloadEvent
            : (payloadEvent?.uri ?? "");

    if (!eventUri) {
        // Nothing to match — acknowledge so Calendly stops retrying.
        return NextResponse.json({ ok: true, ignored: "no event uri" });
    }

    // Resolve the interview (and its org) from the stored row BEFORE
    // verifying: the lookup is read-only, and the signing key lives
    // per-org so the org must be known first. No mutation happens
    // before verification below.
    const row = await get_interview_by_calendly_event_uri(eventUri);
    if (!row) {
        return NextResponse.json({ ok: true, ignored: "unknown event" });
    }

    const creds = await getCalendlyPatForOrg(row.organization);
    const signingKey = creds?.webhookSigningKey;
    if (!signingKey) {
        // Webhooks were never enabled (or were disabled) for this org —
        // nothing to verify against, nothing to do.
        return NextResponse.json({ ok: true, ignored: "webhooks not enabled" });
    }

    if (
        !verify_calendly_signature(
            rawBody,
            req.headers.get("Calendly-Webhook-Signature"),
            signingKey
        )
    ) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
        );
    }

    if (eventType === "invitee.canceled") {
        if (row.status === "CANCELLED") {
            return NextResponse.json({ ok: true, already: "cancelled" });
        }
        const reason =
            body.payload?.cancellation?.reason ?? "Cancelled in Calendly";
        await cancel_interview_db(row.interview_id, row.organization, {
            hold_status: "NONE",
            reason: reason.slice(0, 255),
        });
        console.log(
            `[calendly-webhook] Cancelled interview ${row.interview_id} (org ${row.organization}) from Calendly invitee.canceled`
        );
        return NextResponse.json({ ok: true, cancelled: row.interview_id });
    }

    // invitee.created and anything else: acknowledged, no pending state
    // to confirm for API bookings — nothing is invented here.
    return NextResponse.json({ ok: true, ignored: eventType || "unknown event" });
}
