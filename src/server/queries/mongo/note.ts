"use server";

import { noteSchema } from "@/components/modal/create-note-modal";
import { db } from "@/drizzle/db";
import { applications, candidates, usersTable } from "@/drizzle/schema";
import { CACHE_TAGS, revalidateDbCache } from "@/lib/cache";
import mongodb from "@/lib/mongodb";
import { sendEmail } from "@/lib/resend";
import Note from "@/models/notes";
import Thread from "@/models/threads";
import { canEditCandidate } from "@/server/permissions";
import { db_get_org_members_by_ids } from "@/server/queries/drizzle/organization";
import { db_get_organization_plugins } from "@/server/queries/drizzle/plugin-queries";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

type NoteMention = {
    userId: string;
    name: string;
    username?: string | null;
};

type CompletedNotes = {
    note_text: string;
    note_type: string;
    note_parent_id: string;
    created_by: string;
    author: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    mentions?: NoteMention[];
};

/**
 * Verify a client-supplied mention list against real org membership.
 * Only users with a row in organization_member for the session org survive,
 * and the name/username snapshot comes from the DB, not the client payload.
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
 * Notifies org members mentioned in a note. No in-app notification system
 * exists yet, so this sends email via Resend — the org's configured Resend
 * plugin key when present, otherwise RESEND_API_KEY from the environment.
 * Only users verified as members of the session org are emailed (callers must
 * pass the output of verify_note_mentions), and the author is never emailed.
 * Best-effort: failures are logged and never fail note creation. When no
 * Resend key is configured anywhere, notifications are skipped (the mentions
 * are still persisted on the note).
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

    const plugins = await db_get_organization_plugins(orgId);
    const resendSettings = plugins.settings?.["resend"];
    const apiKey = resendSettings?.credentials?.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn("[notes] No Resend API key configured — mention emails skipped");
        return { notified: 0, skipped: "no-api-key" };
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

export const create_note = async (unsafeData: z.infer<typeof noteSchema>) => {
    try {
        await mongodb();

        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return { error: true, message: "Unauthorized" };
        }

        const { success, data } = await noteSchema.safeParse(unsafeData);
        // Notes attach to candidates — gate on candidate:edit. There is no
        // note-specific permission yet; do not use canCreateJob here.
        const canCreate = await canEditCandidate();

        const user = await db.select().from(usersTable).where(eq(usersTable.id, userId!))
        if (!user.length || !success || !canCreate) {
            return { error: true, message: "There was an error creating your note" }
        };

        // Tenant isolation: the candidate must belong to the session org.
        const [candidate] = await db.select().from(candidates).where(eq(candidates.id, data.candidate_id)).limit(1);
        if (!candidate || candidate.organization !== orgId) {
            return { error: true, message: "Candidate not found" };
        }

        // Never trust the client-supplied mention list — keep only verified org members.
        const verifiedMentions = await verify_note_mentions(orgId, data.mentions ?? []);

        const createdNote = await Note.create({
            ...data,
            mentions: verifiedMentions,
            organization_id: orgId,
            channel: 'Internal Note',
            created_by: user[0].id,
            author: user[0].name,
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
            authorId: userId,
            authorName: user[0].name,
            mentions: verifiedMentions,
            noteText: data.text,
            candidateId: data.candidate_id,
            candidateName: candidate.name,
        }).catch((error) => console.warn("[notes] mention notification failed", error));

        return "Note created successfully...";
    } catch (error) {
        console.log(error);
        return "Failed to create note..."
    }
};

export const get_candidate_notes = async (parent_id: string) => {
    try {
        await mongodb();

        const { orgId } = await auth();
        if (!orgId) return JSON.stringify([]);

        // Tenant isolation: the candidate must belong to the session org.
        // (Legacy notes carry no organization_id, so the parent check is the gate.)
        const candidateId = Number(parent_id);
        if (!Number.isInteger(candidateId)) return JSON.stringify([]);
        const [candidate] = await db.select({ organization: candidates.organization })
            .from(candidates).where(eq(candidates.id, candidateId)).limit(1);
        if (!candidate || candidate.organization !== orgId) return JSON.stringify([]);

        const completeNotes: CompletedNotes[] = [];

        // Notes store note_id as "<parent_type>_<id>"; candidate notes were
        // saved under both "candidate_<id>" and the legacy typo "canditates_<id>".
        const notes = await Note.find({
            note_id: { $in: [`candidate_${parent_id}`, `canditates_${parent_id}`] },
        }).sort({ created_at: -1 });
        for (const note of notes) {
            const copy = { ...note._doc };
            if (!copy.author) {
                const user = await db.select().from(usersTable).where(eq(usersTable.id, note.created_by));
                if (user.length) {
                    copy.author = user[0].name;
                }
            }
            completeNotes.push(copy);
        }
        return JSON.stringify(completeNotes);
    } catch (error) {
        console.log(error);
    }
};

export const get_application_notes = async ({ id, limit, offset }: { id: number, limit: number, offset: number }) => {
    try {
        await mongodb();

        const { orgId } = await auth();
        if (!orgId) return JSON.stringify({ error: true, notes: [] });

        // Tenant isolation: the application must belong to the session org.
        const [application] = await db.select({ organization: applications.organization })
            .from(applications).where(eq(applications.id, id)).limit(1);
        if (!application || application.organization !== orgId) {
            return JSON.stringify({ error: true, notes: [] });
        }

        const note_id = 'application' + "_" + id

        const completeNotes: CompletedNotes[] = [];

        const notes = await Note.find({ note_id: note_id }).limit(limit).skip(offset).sort({ created_at: -1 });
        for (const note of notes) {
            const copy = { ...note._doc };
            if (!copy.author) {
                const user = await db.select().from(usersTable).where(eq(usersTable.id, note.created_by));
                if (user.length) {
                    copy.author = user[0].name;
                }
            }
            completeNotes.push(copy);
        };

        return JSON.stringify({ error: false, notes: completeNotes });
    } catch (error) {
        console.log(error);
        return JSON.stringify({ error: true, notes: [] });
    }
};

/**
 * Does this note belong to the session org? New notes carry organization_id;
 * legacy notes don't, so fall back to verifying the note's parent
 * (candidate_<id> / application_<id>) belongs to the org.
 */
const note_belongs_to_org = async (note: { organization_id?: string; note_id?: string }, orgId: string): Promise<boolean> => {
    if (note.organization_id) return note.organization_id === orgId;

    const match = note.note_id?.match(/^(?:candidate|canditates|application)_(\d+)$/);
    if (!match) return false;
    const parentId = Number(match[1]);

    if (note.note_id!.startsWith("application_")) {
        const [application] = await db.select({ organization: applications.organization })
            .from(applications).where(eq(applications.id, parentId)).limit(1);
        return !!application && application.organization === orgId;
    }
    const [candidate] = await db.select({ organization: candidates.organization })
        .from(candidates).where(eq(candidates.id, parentId)).limit(1);
    return !!candidate && candidate.organization === orgId;
};

export const update_note = async (note_id: string, data: { text?: string; type?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }) => {
    try {
        await mongodb();

        const { orgId } = await auth();
        if (!orgId) return null;
        if (!(await canEditCandidate())) return null;

        const note = await Note.findById(note_id);
        if (!note || !(await note_belongs_to_org(note, orgId))) return null;

        // Whitelist updatable fields — callers must not overwrite
        // organization_id, created_by, or the parent link.
        const update: Record<string, unknown> = {};
        if (typeof data.text === "string") update.text = data.text;
        if (data.type === "POSITIVE" || data.type === "NEGATIVE" || data.type === "NEUTRAL") update.type = data.type;
        if (Object.keys(update).length === 0) return note;

        return await Note.findByIdAndUpdate(note_id, update, { new: true });
    } catch (error) {
        console.log(error);
        return null;
    }
};

export const delete_note = async (note_id: string) => {
    try {
        await mongodb();

        const { orgId } = await auth();
        if (!orgId) return null;
        if (!(await canEditCandidate())) return null;

        const note = await Note.findById(note_id);
        if (!note || !(await note_belongs_to_org(note, orgId))) return null;

        return await Note.findByIdAndDelete(note_id);
    } catch (error) {
        console.log(error);
        return null;
    }
};
