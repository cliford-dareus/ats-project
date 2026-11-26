// ─────────────────────────────────────────────────────────────────────────────
// Server-side note creation core — NO "use server" directive on purpose.
// The public `create_note` in ./note.ts is a server action (auth + permission
// checked there). This module holds the shared record-creation logic so the
// automation executor (BullMQ worker — no Clerk session) can create notes
// through `create_note_record` with an EXPLICIT orgId/userId from its
// already-authorized caller, instead of calling Clerk auth() and failing.
// Nothing exported here is a server action: do not add "use server" to
// this file, and do not import it from client components.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@/drizzle/db";
import { candidates, usersTable } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";
import mongodb from "@/lib/mongodb";
import { sendEmail } from "@/lib/resend";
import Note from "@/models/notes";
import Thread from "@/models/threads";
import { db_get_org_members_by_ids } from "@/server/queries/drizzle/organization";
import { create_notifications_db } from "@/server/queries/mongo/notifications";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import { eq } from "drizzle-orm";

type NoteMention = {
    userId: string;
    name: string;
    username?: string | null;
};

/**
 * Verify a caller-supplied mention list against real org membership.
 * Only users with a row in organization_member for the org survive,
 * and the name/username snapshot comes from the DB, not the caller payload.
 */
const verify_note_mentions = async (orgId: string, mentions: NoteMention[]): Promise<NoteMention[]> => {
    const unique = [...new Map(mentions.map((m) => [m.userId, m])).values()];
    if (unique.length === 0) return [];

    const members = await db_get_org_members_by_ids(orgId, unique.map((m) => m.userId));

    return unique
        .filter((m) => members.some((member) => member.id === m.userId))
        .map((m) => {
            const member = members.find((x) => x.id === m.userId)!;
            return {
                userId: m.userId,
                name: member.name,
                username: member.username ?? undefined,
            };
        });
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export type NoteMentionNotificationInput = {
    orgId: string;
    authorId: string;
    authorName: string;
    mentions: NoteMention[];
    noteText: string;
    candidateId: number;
    candidateName: string;
};

/**
 * ── Mention notification hook ────────────────────────────────────────────────
 * Notifies org members mentioned in a note via in-app notifications and email.
 * In-app notifications are always created. Email is sent via Resend — the org's
 * configured Resend plugin key when present, otherwise RESEND_API_KEY from the
 * environment. Only users verified as members of the org are notified
 * (callers must pass the output of verify_note_mentions), and the author is
 * never notified. Best-effort: failures are logged and never fail note creation.
 * When no Resend key is configured, only in-app notifications are created.
 */
export const notify_mentioned_users = async ({
    orgId,
    authorId,
    authorName,
    mentions,
    noteText,
    candidateId,
    candidateName,
}: NoteMentionNotificationInput) => {
    const targets = mentions.filter((m) => m.userId !== authorId);
    if (targets.length === 0) return { notified: 0 };

    const members = await db_get_org_members_by_ids(orgId, targets.map((m) => m.userId));
    if (members.length === 0) return { notified: 0 };

    // Always create in-app notifications for mentioned users
    try {
        await create_notifications_db(
            orgId,
            members.map((m) => m.id),
            {
                kind: "mention",
                title: `${authorName} mentioned you`,
                body: `${authorName} mentioned you in a note about ${candidateName}.`,
                link: `/candidates/${candidateId}`,
                actor_id: authorId,
                actor_name: authorName,
            },
        );
    } catch (error) {
        console.warn("[notes] Failed to create in-app mention notifications", error);
    }

    const plugins = await db_get_organization_plugins(orgId);
    const resendSettings = plugins.settings?.["resend"];
    const apiKey = resendSettings?.credentials?.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn("[notes] No Resend API key configured — mention emails skipped");
        return { notified: members.length, skipped: "no-api-key" };
    }

    const fromAddress =
        (resendSettings?.config?.fromAddress as string | undefined) ||
        process.env.RESEND_FROM_EMAIL ||
        "recruiting@aplico.online";
    const companyName =
        (resendSettings?.config?.companyName as string | undefined) || "Applico";
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";
    const noteUrl = `https://app.${rootDomain}/candidates/${candidateId}`;

    let notified = 0;
    for (const member of members) {
        try {
            const html = `
                <p style="margin:0 0 12px;line-height:1.6">Hi ${escapeHtml(member.name.split(" ")[0] || member.name)},</p>
                <p style="margin:0 0 12px;line-height:1.6"><strong>${escapeHtml(authorName)}</strong> mentioned you in a note about candidate <strong>${escapeHtml(candidateName)}</strong>:</p>
                <blockquote style="margin:0 0 12px;padding:12px 16px;background:#f4f4f5;border-left:3px solid #18181b;line-height:1.6">${escapeHtml(noteText)}</blockquote>
                <p style="margin:0 0 12px;line-height:1.6"><a href="${noteUrl}">View the candidate</a></p>
                <p style="margin:0;line-height:1.6;color:#71717a">— ${escapeHtml(companyName)} Talent Team</p>
            `;

            await sendEmail({
                apiKey,
                from: `${companyName} Recruiting <${fromAddress}>`,
                to: member.email,
                subject: `${authorName} mentioned you in a note about ${candidateName}`,
                html,
                tags: [
                    { name: "event", value: "note_mention" },
                    { name: "org", value: orgId },
                ],
            });
            notified += 1;
        } catch (error) {
            console.warn(`[notes] Failed to notify mentioned user ${member.id}`, error);
        }
    }

    return { notified };
};

export interface NoteRecordData {
    text: string;
    note_id: string;
    note_type: string;
    candidate_id: number;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    mentions?: NoteMention[];
}

/**
 * Create a note record for an org, with the org and author supplied
 * explicitly by the caller. The caller must already be authorized
 * (Clerk session in `create_note`, or the org-bound automation executor
 * in the worker) — this function performs no auth() call of its own, so
 * it works where there is no Clerk session. It still enforces tenant
 * isolation itself: the candidate must belong to `orgId`, the author
 * must be a real user row (unless `userId` is "system", the automation
 * actor, attributed to "Automation"), and mentions are re-verified
 * against org membership. Throws on failure.
 */
export async function create_note_record({
    orgId,
    userId,
    data,
}: {
    orgId: string;
    userId: string;
    data: NoteRecordData;
}): Promise<string> {
    await mongodb();

    // Resolve the author. "system" is the automation actor (BullMQ worker
    // has no Clerk session) — attribute its notes to "Automation".
    const authorId = userId;
    let authorName = "Automation";
    if (userId !== "system") {
        const user = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user.length) throw new Error("User not found");
        authorName = user[0].name;
    }

    // Tenant isolation: the candidate must belong to this org.
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, data.candidate_id)).limit(1);
    if (!candidate || candidate.organization !== orgId) {
        throw new Error("Candidate not found");
    }

    // Never trust the caller-supplied mention list — keep only verified org members.
    const verifiedMentions = await verify_note_mentions(orgId, data.mentions ?? []);

    const createdNote = await Note.create({
        ...data,
        mentions: verifiedMentions,
        organization_id: orgId,
        channel: 'Internal Note',
        created_by: authorId,
        author: authorName,
    });

    // check if the candidate already has a thread with the organization
    const existingThread = await Thread.findOne({
        organization_id: orgId,
        candidate_id: data.candidate_id,
    });

    if (existingThread) {
        // add the note to the existing thread
        await Thread.updateOne(
            { _id: existingThread._id },
            { $push: { notes: createdNote._id } },
        );

    } else {
        // create a new thread (Thread requires non-empty name/avatar/role/status)
        await Thread.create({
            organization_id: orgId,
            candidate_id: data.candidate_id,
            candidate_name: candidate.name,
            candidate_avatar: "default-avatar.png",
            candidate_role: "Candidate",
            candidate_status: candidate.status ?? "ACTIVE",
            last_message: data.text,
            last_timestamp: new Date(),
            notes: [createdNote._id],
        });
    }

    revalidateDbCache({
        tag: CACHE_TAGS.applications,
        orgId,
    });

    // Best-effort mention notifications — never fail note creation.
    await notify_mentioned_users({
        orgId,
        authorId,
        authorName,
        mentions: verifiedMentions,
        noteText: data.text,
        candidateId: data.candidate_id,
        candidateName: candidate.name,
    }).catch((error) => console.warn("[notes] mention notification failed", error));

    return "Note created successfully...";
}
