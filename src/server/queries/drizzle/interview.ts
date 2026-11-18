import { randomBytes } from "crypto";
import { z } from "zod";
import { and, eq, lt } from "drizzle-orm";
import { newInterviewSchema } from "@/zod";
import { db } from "@/drizzle/db";
import { applications, candidates, interviews, job_listings } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";

export const create_interview_db = async (
    data: z.infer<typeof newInterviewSchema>,
    orgId: string
) => {
    const existingInterview = await db
        .select()
        .from(interviews)
        .where(eq(interviews.applications_id, data.applicationId));
    if (existingInterview.length > 0) {
        throw new Error("Application already has an interview");
    }

    await db.insert(interviews).values({
        applications_id: data.applicationId,
        locations: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        type: data.type,
        link: data.link,
        status: data.status,
        organization: orgId,
        hold_status: "NONE",
    });

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId: orgId,
    });

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.job_id),
        orgId: orgId,
    });
};

export type CreateHoldInput = {
    applicationId: number;
    job_id: number;
    start_at: Date;
    end_at: Date;
    type: "VIDEO" | "PHONE" | "ONSITE";
    location: string;
    calendar_event_id?: string;
    calendar_owner_id: string;
    interviewer_ids?: string[];
    link?: string;
    hold_hours?: number; // default 48
};

export const create_interview_hold_db = async (
    data: CreateHoldInput,
    orgId: string
) => {
    const existing = await db
        .select({ id: interviews.id })
        .from(interviews)
        .where(eq(interviews.applications_id, data.applicationId))
        .limit(1);

    if (existing.length > 0) {
        throw new Error("Application already has an interview");
    }

    const hold_token = randomBytes(24).toString("hex");
    const hours = data.hold_hours ?? 48;
    const hold_expires_at = new Date(Date.now() + hours * 60 * 60 * 1000);

    const result = await db.insert(interviews).values({
        applications_id: data.applicationId,
        locations: data.location,
        start_at: data.start_at,
        end_at: data.end_at,
        type: data.type,
        link: data.link,
        status: "HOLD_PENDING",
        organization: orgId,
        hold_token,
        hold_status: "TENTATIVE",
        hold_expires_at,
        calendar_event_id: data.calendar_event_id,
        calendar_owner_id: data.calendar_owner_id,
        interviewer_ids: data.interviewer_ids ?? [],
    });

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        id: String(data.applicationId),
        orgId,
    });

    return {
        hold_token,
        hold_expires_at,
        // mysql insert id when available
        insertId: (result as { insertId?: number })?.insertId,
    };
};

export const get_interview_by_hold_token = async (token: string) => {
    const rows = await db
        .select({
            interview_id: interviews.id,
            applications_id: interviews.applications_id,
            start_at: interviews.start_at,
            end_at: interviews.end_at,
            type: interviews.type,
            locations: interviews.locations,
            link: interviews.link,
            status: interviews.status,
            hold_status: interviews.hold_status,
            hold_expires_at: interviews.hold_expires_at,
            calendar_event_id: interviews.calendar_event_id,
            calendar_owner_id: interviews.calendar_owner_id,
            organization: interviews.organization,
            candidate_name: candidates.name,
            candidate_email: candidates.email,
            job_name: job_listings.name,
        })
        .from(interviews)
        .leftJoin(
            applications,
            eq(applications.id, interviews.applications_id)
        )
        .leftJoin(candidates, eq(candidates.id, applications.candidate))
        .leftJoin(job_listings, eq(job_listings.id, applications.job_id))
        .where(eq(interviews.hold_token, token))
        .limit(1);

    return rows[0] ?? null;
};

export const get_interview_by_application_db = async (applicationId: number) => {
    const rows = await db
        .select({ id: interviews.id })
        .from(interviews)
        .where(eq(interviews.applications_id, applicationId))
        .limit(1);

    return rows[0] ?? null;
};

export const mark_hold_confirmed_db = async (
    interviewId: number,
    orgId: string,
    updates?: { calendar_event_id?: string; link?: string }
) => {
    await db
        .update(interviews)
        .set({
            hold_status: "CONFIRMED",
            status: "SCHEDULE",
            ...(updates?.calendar_event_id
                ? { calendar_event_id: updates.calendar_event_id }
                : {}),
            ...(updates?.link ? { link: updates.link } : {}),
        })
        .where(
            and(
                eq(interviews.id, interviewId),
                eq(interviews.organization, orgId)
            )
        );

    revalidateDbCache({ tag: CACHE_TAGS.applications, orgId });
};

export const mark_hold_released_db = async (
    interviewId: number,
    orgId: string,
    hold_status: "DECLINED" | "EXPIRED" | "RELEASED"
) => {
    // Only the hold outcome changes. The interview status stays HOLD_PENDING:
    // a declined/expired/released hold was never confirmed, so it must not
    // read as SCHEDULE — SCHEDULE-filtered queries (upcoming interviews,
    // alerts) would otherwise surface a dead hold as a live interview.
    // This matches mark_hold_expired_db, which likewise leaves status alone;
    // the outcome lives in hold_status, which the UI keys off.
    await db
        .update(interviews)
        .set({ hold_status })
        .where(
            and(
                eq(interviews.id, interviewId),
                eq(interviews.organization, orgId)
            )
        );

    revalidateDbCache({ tag: CACHE_TAGS.applications, orgId });
};

/** Tentative holds past their expiry. Worker-safe: plain select, no cache calls. */
export const get_stale_holds_db = async () => {
    const now = new Date();
    return db
        .select({
            id: interviews.id,
            organization: interviews.organization,
            calendar_event_id: interviews.calendar_event_id,
            calendar_owner_id: interviews.calendar_owner_id,
        })
        .from(interviews)
        .where(
            and(
                eq(interviews.hold_status, "TENTATIVE"),
                lt(interviews.hold_expires_at, now)
            )
        )
        .limit(100);
};

/**
 * Mark one hold expired. Worker-safe: no Next cache revalidation
 * (revalidateTag is unavailable outside the Next runtime — see
 * db_save_resume_score, which skips revalidation for the same reason).
 */
export const mark_hold_expired_db = async (interviewId: number) => {
    await db
        .update(interviews)
        .set({ hold_status: "EXPIRED" })
        .where(eq(interviews.id, interviewId));
};

/** Mark expired tentative holds (call from cron / worker). */
export const expire_stale_holds_db = async () => {
    const stale = await get_stale_holds_db();

    for (const row of stale) {
        await mark_hold_expired_db(row.id);
    }

    return stale;
};
