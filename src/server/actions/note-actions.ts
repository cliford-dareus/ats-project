"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { organization_member, users_table } from "@/drizzle/schema";
import { createNoteSchema } from "@/zod";
import { get_app_url } from "@/lib/marketing";
import {
    assertApplicationBelongsToOrg,
    assertCandidateBelongsToOrg,
    requirePermission,
} from "@/server/permissions";
import {
    create_note_db,
    delete_note_db,
    get_candidate_notes_db,
    get_notes_db,
} from "@/server/queries/mongo/note";
import { create_notifications_db } from "@/server/queries/mongo/notifications";
import { send_org_email } from "@/server/email/org-mailer";

const listSchema = z.object({
    parent_type: z.enum(["application", "candidate"]),
    parent_id: z.number().int().positive(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
});

async function resolve_parent(orgId: string, parent_type: "application" | "candidate", parent_id: number) {
    if (parent_type === "application") {
        const app = await assertApplicationBelongsToOrg(parent_id, orgId);
        return { candidate_id: app.candidate_id ?? undefined, link: `/applications/${parent_id}` };
    }
    await assertCandidateBelongsToOrg(parent_id, orgId);
    return { candidate_id: parent_id, link: `/candidates/${parent_id}` };
}

export const get_notes_action = async (input: z.input<typeof listSchema>) => {
    const { orgId } = await requirePermission("candidate:view");
    const parsed = listSchema.parse(input);
    await resolve_parent(orgId, parsed.parent_type, parsed.parent_id);
    return get_notes_db({ orgId, ...parsed });
};

export const get_candidate_notes_action = async (candidateId: number) => {
    const { orgId } = await requirePermission("candidate:view");
    await assertCandidateBelongsToOrg(candidateId, orgId);
    return get_candidate_notes_db(orgId, candidateId);
};

/**
 * Create an internal note. Mentions are filtered to members of the session org,
 * then notified in-app (and by email when Resend is configured).
 */
export const create_note_action = async (input: z.input<typeof createNoteSchema>) => {
    const { userId, orgId } = await requirePermission("note:create");
    const parsed = createNoteSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid note" };
    }
    const data = parsed.data;
    const parent = await resolve_parent(orgId, data.parent_type, data.parent_id);

    // Only keep mentions of real members of THIS org, and only if still present in the text.
    const requestedIds = [...new Set(data.mentions.map((m) => m.userId))].filter((id) => id !== userId);
    const members = requestedIds.length
        ? await db
            .select({ id: users_table.id, name: users_table.name, username: users_table.username, email: users_table.email })
            .from(organization_member)
            .innerJoin(users_table, eq(users_table.id, organization_member.user_id))
            .where(and(eq(organization_member.organization_id, orgId), inArray(organization_member.user_id, requestedIds)))
        : [];
    const mentioned = members.filter((m) =>
        data.text.includes(`@${m.username ?? m.name}`) || data.text.includes(`@${m.name}`)
    );

    const note = await create_note_db({
        orgId,
        userId,
        parent_type: data.parent_type,
        parent_id: data.parent_id,
        candidate_id: parent.candidate_id,
        text: data.text,
        type: data.type,
        mentions: mentioned.map((m) => ({ userId: m.id, name: m.name, username: m.username })),
    });

    if (mentioned.length > 0) {
        const preview = data.text.length > 140 ? `${data.text.slice(0, 137)}…` : data.text;
        try {
            await create_notifications_db(orgId, mentioned.map((m) => m.id), {
                kind: "mention",
                title: `${note.author} mentioned you in a note`,
                body: preview,
                link: parent.link,
                actor_id: userId,
                actor_name: note.author,
            });

            await Promise.allSettled(
                mentioned.map((m) =>
                    send_org_email({
                        orgId,
                        to: m.email,
                        toName: m.name,
                        subject: `${note.author} mentioned you in Applico`,
                        text: `${note.author} mentioned you in an internal note:\n\n"${preview}"\n\nOpen it: ${get_app_url()}${parent.link}`,
                        type: "mention",
                        sentBy: userId,
                        authorName: note.author,
                    })
                )
            );
        } catch (err) {
            // Notifications must never fail the note itself.
            console.warn("[create_note_action] mention notification failed", (err as Error).message);
        }
    }

    return { success: true as const, note };
};

export const delete_note_action = async (noteId: string) => {
    const { userId, orgId } = await requirePermission("note:create");
    if (!/^[a-f0-9]{24}$/.test(noteId)) return { success: false as const, error: "Invalid note" };
    const ok = await delete_note_db(orgId, noteId, userId);
    return ok ? { success: true as const } : { success: false as const, error: "Note not found" };
};
