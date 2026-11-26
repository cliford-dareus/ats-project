"use server";

import { noteSchema } from "@/components/modal/create-note-modal";
import { db } from "@/drizzle/db";
import { applications, candidates, usersTable } from "@/drizzle/schema";
import mongodb from "@/lib/mongodb";
import Note from "@/models/notes";
import { canEditCandidate } from "@/server/permissions";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { create_note_record } from "./note-core";

// Re-exported for compatibility — the implementation lives in ./note-core
// (no "use server" there, so the automation executor can use it without
// a Clerk session). Kept here so existing import paths keep working.
export { notify_mentioned_users } from "./note-core";
export type { NoteMentionNotificationInput } from "./note-core";

type CompletedNotes = {
    note_text: string;
    note_type: string;
    note_parent_id: string;
    created_by: string;
    author: string;
    type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    mentions?: { userId: string; name: string; username?: string | null }[];
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

        // Record creation lives in ./note-core (shared with the automation
        // executor, which has no Clerk session). It re-verifies the
        // candidate/org binding defensively.
        return await create_note_record({
            orgId,
            userId: userId!,
            data: { ...data, type: data.type ?? "NEUTRAL" },
        });
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
