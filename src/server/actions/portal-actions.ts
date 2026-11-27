'use server';

// Server actions for the candidate portal (backend half — the portal UI
// lives in src/app/(public)/[domain]/portal/, owned by the UI agent).
//
//  - request_portal_link_action: PUBLIC. Always returns { success: true }
//    so the response never reveals whether an address exists. Rate-limited
//    with the same in-memory fixed-window pattern as the interview-hold
//    actions (src/lib/rate-limit.ts); a limited caller still gets the
//    generic success shape, so the limit itself leaks nothing.
//  - resend_portal_link_action: authenticated, application:view-gated
//    (the permission the application detail page uses), org-scoped from
//    the Clerk session — never from a client-supplied orgId.

import { createHash } from "node:crypto";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { applications } from "@/drizzle/schema";
import { get_client_ip, rate_limit } from "@/lib/rate-limit";
import { canViewApplication } from "@/server/permissions";
import {
    request_portal_link_by_email,
    send_portal_link_for_candidate,
} from "@/server/portal/portal-service";

const requestPortalLinkSchema = z.object({
    email: z.string().trim().email().max(255),
    subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
});

// Same 10-minute window as the hold actions. Per-IP is the enumeration
// defense; per-email-hash (never the raw address) stops one inbox being
// spammed with link mail.
const PORTAL_REQUEST_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PORTAL_REQUEST_IP_LIMIT = 30;
const PORTAL_REQUEST_EMAIL_LIMIT = 5;

/** Public "email me my portal link". Always { success: true }. */
export async function request_portal_link_action(
    email: string,
    subdomain: string,
): Promise<{ success: true }> {
    const parsed = requestPortalLinkSchema.safeParse({ email, subdomain });
    if (!parsed.success) return { success: true };

    // Rate-limit first — but a limited caller still gets the generic
    // success shape, so the limit reveals nothing about the address.
    const ip = await get_client_ip();
    const emailHash = createHash("sha256").update(parsed.data.email.toLowerCase()).digest("hex");
    const allowed =
        (await rate_limit(`portal:request:ip:${ip}`, PORTAL_REQUEST_IP_LIMIT, PORTAL_REQUEST_RATE_LIMIT_WINDOW_MS)) &&
        (await rate_limit(`portal:request:email:${emailHash}`, PORTAL_REQUEST_EMAIL_LIMIT, PORTAL_REQUEST_RATE_LIMIT_WINDOW_MS));
    if (!allowed) return { success: true };

    return request_portal_link_by_email(parsed.data.email, parsed.data.subdomain);
}

/** Recruiter resend from the application detail page. Session-org scoped. */
export async function resend_portal_link_action(
    applicationId: number,
): Promise<{ success: boolean; message: string }> {
    const { userId, orgId } = await auth();
    const parsed = z.number().int().positive().safeParse(applicationId);
    const allowed = await canViewApplication();

    if (!userId || !orgId || !allowed || !parsed.success) {
        return { success: false, message: "Could not send the portal link." };
    }

    // Org-scoped resolve: a cross-org application id is rejected here.
    const [application] = await db
        .select({ candidateId: applications.candidate })
        .from(applications)
        .where(
            and(
                eq(applications.id, parsed.data),
                eq(applications.organization, orgId),
                isNull(applications.deleted_at),
            ),
        )
        .limit(1);

    if (!application || application.candidateId === null) {
        return { success: false, message: "Could not send the portal link." };
    }

    const result = await send_portal_link_for_candidate(application.candidateId, orgId);
    if (!result.success) {
        return { success: false, message: "Could not send the portal link." };
    }
    return { success: true, message: "Portal link sent to the candidate." };
}
